# lib/agentic/sales_crew.py
import os
import sys
from crewai import Agent, Task, Crew, Process
from langchain_groq import ChatGroq

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

# Initialize LLM
llm = ChatGroq(
    api_key=os.environ.get("GROQ_API_KEY"),
    model="llama-3.3-70b-versatile",
    temperature=0.7
)

# Define Agents
researcher = Agent(
    role="Lead Researcher",
    goal="Find leads for {niche} in {location}",
    backstory="Expert lead researcher using internal tools.",
    llm=llm,
    verbose=True
)

qualifier = Agent(
    role="Lead Qualifier",
    goal="Score and prioritize leads",
    backstory="Sales expert with 10 years experience.",
    llm=llm,
    verbose=True
)

writer = Agent(
    role="Outreach Writer",
    goal="Write personalized cold emails",
    backstory="Master copywriter",
    llm=llm,
    verbose=True
)

manager = Agent(
    role="Sales Manager",
    goal="Orchestrate the entire pipeline",
    backstory="Experienced sales manager",
    llm=llm,
    verbose=True
)

# Define Tasks
def get_tasks(niche, location):
    return [
        Task(
            description=f"Research leads for {niche} in {location}",
            agent=researcher,
            expected_output="List of leads"
        ),
        Task(
            description="Score and prioritize the leads",
            agent=qualifier,
            context=[research_task],
            expected_output="Scored leads"
        ),
        Task(
            description="Write emails for qualified leads",
            agent=writer,
            context=[qualify_task],
            expected_output="Email content"
        )
    ]

# Run Crew
def run_sales_crew(niche, location):
    tasks = get_tasks(niche, location)
    crew = Crew(
        agents=[researcher, qualifier, writer],
        tasks=tasks,
        process=Process.hierarchical,
        manager_agent=manager,
        verbose=True
    )
    return crew.kickoff()

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--niche", default="real-estate")
    parser.add_argument("--location", default="Karachi")
    args = parser.parse_args()
    
    result = run_sales_crew(args.niche, args.location)
    print(result)