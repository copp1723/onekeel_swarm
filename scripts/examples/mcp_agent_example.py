import asyncio
from huggingface_hub import Agent

# Example MCP Agent setup for coding assistance
async def main():
    # Initialize agent with Qwen2.5-Coder (most balanced option)
    agent = Agent(
        model="Qwen/Qwen2.5-Coder-32B-Instruct",
        servers=[
            {
                "type": "stdio",
                "config": {
                    "command": "npx",
                    "args": ["-y", "@modelcontextprotocol/server-filesystem"],
                    "env": {"WORKSPACE_DIR": "/Users/joshcopp/Desktop/onekeel_swarm"}
                }
            }
        ],
        prompt="""You are an expert coding assistant. Help build, debug, and optimize code.
        You have access to the filesystem to read and analyze code.
        Always explain your reasoning and suggest best practices."""
    )
    
    # Example: Ask agent to analyze your project
    response = await agent.run("Analyze the project structure and suggest improvements")
    print(response)

if __name__ == "__main__":
    asyncio.run(main())