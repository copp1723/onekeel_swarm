"""
VS Code MCP Integration - Run this as a local server that VS Code extensions can connect to
"""
import asyncio
from typing import List, Dict
from huggingface_hub import Agent
import json

class VSCodeMCPServer:
    def __init__(self, model: str = "meta-llama/Meta-Llama-3.1-70B-Instruct"):
        self.agent = None
        self.model = model
        
    async def initialize(self):
        """Initialize the MCP agent with coding-specific tools"""
        self.agent = Agent(
            model=self.model,
            servers=[
                # Filesystem access
                {
                    "type": "stdio",
                    "config": {
                        "command": "npx",
                        "args": ["-y", "@modelcontextprotocol/server-filesystem"],
                        "env": {"WORKSPACE_DIR": "."}
                    }
                },
                # Code execution (be careful with this!)
                {
                    "type": "stdio", 
                    "config": {
                        "command": "npx",
                        "args": ["-y", "@modelcontextprotocol/server-python"]
                    }
                }
            ],
            prompt="""You are a VS Code AI assistant. Help with:
            - Writing clean, efficient code
            - Debugging and fixing errors
            - Refactoring for better performance
            - Writing tests and documentation
            - Following project conventions and best practices
            """
        )
    
    async def handle_request(self, request: Dict) -> Dict:
        """Handle coding requests from VS Code"""
        action = request.get("action")
        
        if action == "complete_code":
            context = request.get("context", "")
            cursor_position = request.get("cursor", "")
            response = await self.agent.run(
                f"Complete this code at cursor position:\n{context}\nCursor: {cursor_position}"
            )
            return {"completion": response}
            
        elif action == "explain_code":
            code = request.get("code", "")
            response = await self.agent.run(f"Explain this code:\n```\n{code}\n```")
            return {"explanation": response}
            
        elif action == "fix_error":
            error = request.get("error", "")
            code = request.get("code", "")
            response = await self.agent.run(
                f"Fix this error:\nError: {error}\nCode:\n```\n{code}\n```"
            )
            return {"fix": response}
            
        elif action == "refactor":
            code = request.get("code", "")
            goal = request.get("goal", "improve readability and performance")
            response = await self.agent.run(
                f"Refactor this code to {goal}:\n```\n{code}\n```"
            )
            return {"refactored": response}
            
        elif action == "generate_tests":
            code = request.get("code", "")
            framework = request.get("framework", "pytest")
            response = await self.agent.run(
                f"Generate {framework} tests for:\n```\n{code}\n```"
            )
            return {"tests": response}
            
        else:
            return {"error": f"Unknown action: {action}"}

# Example usage
async def main():
    server = VSCodeMCPServer(model="Qwen/Qwen2.5-Coder-32B-Instruct")
    await server.initialize()
    
    # Example: Fix an error
    request = {
        "action": "fix_error",
        "error": "TypeError: unsupported operand type(s) for +: 'int' and 'str'",
        "code": "def calculate_total(items):\n    total = 0\n    for item in items:\n        total = total + item['price']\n    return total"
    }
    
    result = await server.handle_request(request)
    print(json.dumps(result, indent=2))

if __name__ == "__main__":
    asyncio.run(main())