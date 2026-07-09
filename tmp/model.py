from huggingface_hub import snapshot_download

# This will download the 'moonshine-medium' model to your local folder
snapshot_download(repo_id="UsefulSensors/moonshine-medium", local_dir="./models/moonshine/medium")