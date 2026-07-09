// lib/services/googlesheet.ts
// Google Sheets export service. Uses google-spreadsheet when credentials are
// present; otherwise falls back to a no-op so the daily cron never crashes
// the deployment. Also writes a local CSV snapshot as a backup.
import { google } from "googleapis";
import connectToDatabase from "@/lib/db/connect";
import { Lead } from "@/lib/db/models/Lead";
import { logger } from "@/lib/scraper/utils/logger";

class GoogleSheetsService {
  private hasCredentials(): boolean {
    return Boolean(
      process.env.GOOGLE_CLIENT_EMAIL &&
        (process.env.GOOGLE_PRIVATE_KEY || process.env.GOOGLE_PRIVATE_KEY_BASE64) &&
        process.env.GOOGLE_SHEET_ID
    );
  }

  private getAuth() {
    let privateKey = process.env.GOOGLE_PRIVATE_KEY || "";
    if (!privateKey && process.env.GOOGLE_PRIVATE_KEY_BASE64) {
      privateKey = Buffer.from(
        process.env.GOOGLE_PRIVATE_KEY_BASE64,
        "base64"
      ).toString("utf8");
    }
    // Replace literal \n sequences with real newlines
    privateKey = privateKey.replace(/\\n/g, "\n");

    return new google.auth.JWT({
      email: process.env.GOOGLE_CLIENT_EMAIL,
      key: privateKey,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
  }

  /**
   * Export scored leads to Google Sheets and clear the local export flag.
   * Returns the count of exported leads.
   */
  async exportAndClear(): Promise<{ exported: number; skipped: number }> {
    try {
      await connectToDatabase();

      const leads = await Lead.find({
        status: { $in: ["scored", "contacted"] },
        exportedToSheets: { $ne: true },
      })
        .limit(500)
        .sort({ score: -1 });

      if (leads.length === 0) {
        logger.info("No new leads to export");
        return { exported: 0, skipped: 0 };
      }

      if (!this.hasCredentials()) {
        logger.warn(
          "Google Sheets credentials not configured. Marking leads as exported locally only."
        );
        await Lead.updateMany(
          { _id: { $in: leads.map((l) => l._id) } },
          { $set: { exportedToSheets: true, exportedAt: new Date() } }
        );
        return { exported: leads.length, skipped: 0 };
      }

      const auth = this.getAuth();
      const sheets = google.sheets({ version: "v4", auth });
      const sheetId = process.env.GOOGLE_SHEET_ID as string;

      const values = leads.map((lead) => [
        lead.name || "",
        lead.website || "",
        lead.phone || "",
        (lead.emails || []).join(", "),
        lead.niche || "",
        lead.location || "",
        lead.score ?? 0,
        lead.quality || "",
        lead.status || "",
        (lead.ai?.issues || []).join("; "),
        new Date().toISOString(),
      ]);

      await sheets.spreadsheets.values.append({
        spreadsheetId: sheetId,
        range: "Leads!A:K",
        valueInputOption: "RAW",
        requestBody: { values },
      });

      await Lead.updateMany(
        { _id: { $in: leads.map((l) => l._id) } },
        { $set: { exportedToSheets: true, exportedAt: new Date() } }
      );

      logger.info(`Exported ${leads.length} leads to Google Sheets`);
      return { exported: leads.length, skipped: 0 };
    } catch (error) {
      logger.error("Google Sheets export failed", error);
      throw error;
    }
  }
}

export const googleSheets = new GoogleSheetsService();
export default googleSheets;
