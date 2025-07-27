import asyncio
from huggingface_hub import MCPClient

async def coding_assistant_demo():
    # Initialize MCPClient with your preferred model
    client = MCPClient(
        model="deepseek-ai/DeepSeek-Coder-V2-Instruct",  # Or any of the top 3
        # provider="auto"  # Will use best available provider
    )
    
    # Add MCP servers for different capabilities
    # 1. Filesystem access for code reading/writing
    await client.add_mcp_server(
        type="stdio",
        command="npx",
        args=["-y", "@modelcontextprotocol/server-filesystem"],
        env={"WORKSPACE_DIR": "/Users/joshcopp/Desktop/onekeel_swarm"}
    )
    
    # 2. Git operations (optional)
    await client.add_mcp_server(
        type="stdio",
        command="npx",
        args=["-y", "@modelcontextprotocol/server-git"]
    )
    
    # 3. Web search for documentation (optional)
    await client.add_mcp_server(
        type="sse",
        url="https://mcp-server-brave-search.vercel.app/sse",
        headers={"Authorization": f"Bearer YOUR_BRAVE_API_KEY"}
    )
    
    # Example conversation with tool usage
    messages = [
        {"role": "user", "content": "Review the Python files in this project and suggest performance improvements"}
    ]
    
    # Process with tools - this handles the full tool-calling loop
    async for chunk in client.process_single_turn_with_tools(messages):
        if chunk.get("type") == "content":
            print(chunk.get("text", ""), end="", flush=True)
        elif chunk.get("type") == "tool_use":
            print(f"\n🔧 Using tool: {chunk.get('name')}")
        elif chunk.get("type") == "tool_result":
            print(f"✅ Tool completed\n")
    
    # Cleanup when done
    await client.cleanup()

# Run the assistant
if __name__ == "__main__":
    asyncio.run(coding_assistant_demo())