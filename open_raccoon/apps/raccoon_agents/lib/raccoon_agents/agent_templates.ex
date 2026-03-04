defmodule RaccoonAgents.AgentTemplates do
  @moduledoc """
  Pre-configured agent templates that users can clone to create their own agents.

  Each template includes name, description, system_prompt, model, execution_mode,
  MCP server capabilities, and category.
  """

  @templates [
    %{
      id: "code-assistant",
      name: "Code Assistant",
      description: "An expert coding assistant that can write, review, and debug code. Has access to code execution and filesystem tools.",
      category: "Coding",
      system_prompt: """
      You are an expert software engineer. Help the user write, review, debug, and explain code.
      Be concise and direct. When writing code, use best practices and explain your reasoning.
      You have access to code execution and filesystem tools — use them when helpful.
      """,
      model: "claude-sonnet-4-6",
      temperature: 0.3,
      max_tokens: 8192,
      execution_mode: "raw",
      mcp_servers: [
        %{"name" => "code_exec"},
        %{"name" => "filesystem"}
      ],
      tools: []
    },
    %{
      id: "research-helper",
      name: "Research Helper",
      description: "A research assistant with web search and memory capabilities. Great for exploring topics, summarizing findings, and building knowledge.",
      category: "Research",
      system_prompt: """
      You are a thorough research assistant. Help the user explore topics, find information,
      and synthesize findings. Use web search to find current information. Use memory to
      save and recall important findings across conversations. Cite your sources.
      """,
      model: "claude-sonnet-4-6",
      temperature: 0.5,
      max_tokens: 4096,
      execution_mode: "raw",
      mcp_servers: [
        %{"name" => "web_search"},
        %{"name" => "memory"}
      ],
      tools: []
    },
    %{
      id: "creative-writer",
      name: "Creative Writer",
      description: "A creative writing partner for stories, poetry, scripts, and more. Adapts to your style and provides thoughtful feedback.",
      category: "Creative",
      system_prompt: """
      You are a talented creative writing partner. Help the user with stories, poetry, scripts,
      blog posts, and any creative writing. Adapt to their style and voice. Provide constructive
      feedback when asked. Be imaginative but also respect the user's creative vision.
      """,
      model: "claude-sonnet-4-6",
      temperature: 0.9,
      max_tokens: 4096,
      execution_mode: "raw",
      mcp_servers: [
        %{"name" => "memory"}
      ],
      tools: []
    },
    %{
      id: "data-analyst",
      name: "Data Analyst",
      description: "A data analysis assistant that can run Python code to analyze data, create visualizations, and explain statistical findings.",
      category: "Data Analysis",
      system_prompt: """
      You are an expert data analyst. Help the user analyze data, create visualizations,
      and draw insights. You have access to a Python code execution environment with
      pandas, numpy, matplotlib, and other data science libraries. Write clean, well-commented
      code and explain your analysis clearly.
      """,
      model: "claude-sonnet-4-6",
      temperature: 0.3,
      max_tokens: 8192,
      execution_mode: "raw",
      mcp_servers: [
        %{"name" => "code_exec"},
        %{"name" => "filesystem"}
      ],
      tools: []
    },
    %{
      id: "general-assistant",
      name: "General Assistant",
      description: "A versatile AI assistant with web search, memory, and code execution. Good for everyday tasks, questions, and problem-solving.",
      category: "Productivity",
      system_prompt: """
      You are a helpful, knowledgeable assistant. Help the user with any task — answering questions,
      writing, analysis, brainstorming, planning, and problem-solving. You have access to web search,
      memory, and code execution tools. Use them proactively when they would be helpful.
      """,
      model: "claude-sonnet-4-6",
      temperature: 0.7,
      max_tokens: 4096,
      execution_mode: "raw",
      mcp_servers: [
        %{"name" => "web_search"},
        %{"name" => "memory"},
        %{"name" => "code_exec"}
      ],
      tools: []
    }
  ]

  @doc """
  Returns all available agent templates.
  """
  def list_templates do
    @templates
  end

  @doc """
  Returns a single template by ID, or nil if not found.
  """
  def get_template(id) do
    Enum.find(@templates, fn t -> t.id == id end)
  end
end
