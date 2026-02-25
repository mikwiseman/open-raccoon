defmodule Raccoon.Agent.V1.Message do
  @moduledoc false
  use Protobuf, protoc_gen_elixir_version: "0.13.0", syntax: :proto3

  field :role, 1, type: :string
  field :content, 2, type: :string
  field :message_id, 3, type: :string, json_name: "messageId"
end

defmodule Raccoon.Agent.V1.AgentRequest do
  @moduledoc false
  use Protobuf, protoc_gen_elixir_version: "0.13.0", syntax: :proto3

  field :conversation_id, 1, type: :string, json_name: "conversationId"
  field :agent_id, 2, type: :string, json_name: "agentId"
  field :messages, 3, repeated: true, type: Raccoon.Agent.V1.Message
  field :config, 4, type: Raccoon.Agent.V1.AgentConfig
  field :user_api_key, 5, type: :string, json_name: "userApiKey"
  field :request_id, 6, type: :string, json_name: "requestId"
end

defmodule Raccoon.Agent.V1.AgentResponse do
  @moduledoc false
  use Protobuf, protoc_gen_elixir_version: "0.13.0", syntax: :proto3

  oneof :event, 0

  field :token, 1, type: Raccoon.Agent.V1.TokenEvent, oneof: 0
  field :status, 2, type: Raccoon.Agent.V1.StatusEvent, oneof: 0
  field :tool_call, 3, type: Raccoon.Agent.V1.ToolCallEvent, json_name: "toolCall", oneof: 0
  field :tool_result, 4, type: Raccoon.Agent.V1.ToolResultEvent, json_name: "toolResult", oneof: 0
  field :code_block, 5, type: Raccoon.Agent.V1.CodeBlockEvent, json_name: "codeBlock", oneof: 0
  field :error, 6, type: Raccoon.Agent.V1.ErrorEvent, oneof: 0

  field :approval_request, 7,
    type: Raccoon.Agent.V1.ApprovalRequestEvent,
    json_name: "approvalRequest",
    oneof: 0

  field :complete, 8, type: Raccoon.Agent.V1.CompleteEvent, oneof: 0
end

defmodule Raccoon.Agent.V1.TokenEvent do
  @moduledoc false
  use Protobuf, protoc_gen_elixir_version: "0.13.0", syntax: :proto3

  field :text, 1, type: :string
end

defmodule Raccoon.Agent.V1.StatusEvent do
  @moduledoc false
  use Protobuf, protoc_gen_elixir_version: "0.13.0", syntax: :proto3

  field :message, 1, type: :string
  field :category, 2, type: :string
end

defmodule Raccoon.Agent.V1.ToolCallEvent do
  @moduledoc false
  use Protobuf, protoc_gen_elixir_version: "0.13.0", syntax: :proto3

  field :tool_call_id, 1, type: :string, json_name: "toolCallId"
  field :tool_name, 2, type: :string, json_name: "toolName"
  field :arguments, 3, type: Google.Protobuf.Struct
end

defmodule Raccoon.Agent.V1.ToolResultEvent do
  @moduledoc false
  use Protobuf, protoc_gen_elixir_version: "0.13.0", syntax: :proto3

  field :tool_call_id, 1, type: :string, json_name: "toolCallId"
  field :tool_name, 2, type: :string, json_name: "toolName"
  field :success, 3, type: :bool
  field :output, 4, type: :string
  field :error_message, 5, type: :string, json_name: "errorMessage"
end

defmodule Raccoon.Agent.V1.CodeBlockEvent do
  @moduledoc false
  use Protobuf, protoc_gen_elixir_version: "0.13.0", syntax: :proto3

  field :language, 1, type: :string
  field :code, 2, type: :string
  field :filename, 3, type: :string
end

defmodule Raccoon.Agent.V1.ErrorEvent do
  @moduledoc false
  use Protobuf, protoc_gen_elixir_version: "0.13.0", syntax: :proto3

  field :code, 1, type: :string
  field :message, 2, type: :string
  field :recoverable, 3, type: :bool
end

defmodule Raccoon.Agent.V1.ApprovalRequestEvent do
  @moduledoc false
  use Protobuf, protoc_gen_elixir_version: "0.13.0", syntax: :proto3

  field :approval_id, 1, type: :string, json_name: "approvalId"
  field :tool_name, 2, type: :string, json_name: "toolName"
  field :arguments, 3, type: Google.Protobuf.Struct
  field :reason, 4, type: :string
end

defmodule Raccoon.Agent.V1.CompleteEvent do
  @moduledoc false
  use Protobuf, protoc_gen_elixir_version: "0.13.0", syntax: :proto3

  field :input_tokens, 1, type: :int32, json_name: "inputTokens"
  field :output_tokens, 2, type: :int32, json_name: "outputTokens"
  field :model, 3, type: :string
  field :stop_reason, 4, type: :string, json_name: "stopReason"
end

defmodule Raccoon.Agent.V1.AgentConfig do
  @moduledoc false
  use Protobuf, protoc_gen_elixir_version: "0.13.0", syntax: :proto3

  field :agent_id, 1, type: :string, json_name: "agentId"
  field :system_prompt, 2, type: :string, json_name: "systemPrompt"
  field :model, 3, type: :string
  field :temperature, 4, type: :double
  field :max_tokens, 5, type: :int32, json_name: "maxTokens"
  field :tools, 6, repeated: true, type: Raccoon.Agent.V1.ToolConfig
  field :visibility, 7, type: :string
end

defmodule Raccoon.Agent.V1.ToolConfig do
  @moduledoc false
  use Protobuf, protoc_gen_elixir_version: "0.13.0", syntax: :proto3

  field :name, 1, type: :string
  field :description, 2, type: :string
  field :input_schema, 3, type: Google.Protobuf.Struct, json_name: "inputSchema"
  field :requires_approval, 4, type: :bool, json_name: "requiresApproval"
end

defmodule Raccoon.Agent.V1.AgentConfigRequest do
  @moduledoc false
  use Protobuf, protoc_gen_elixir_version: "0.13.0", syntax: :proto3

  field :agent_id, 1, type: :string, json_name: "agentId"
end

defmodule Raccoon.Agent.V1.AgentService.Service do
  @moduledoc false
  use GRPC.Service, name: "raccoon.agent.v1.AgentService"

  rpc :ExecuteAgent, Raccoon.Agent.V1.AgentRequest, stream(Raccoon.Agent.V1.AgentResponse)
  rpc :GetAgentConfig, Raccoon.Agent.V1.AgentConfigRequest, Raccoon.Agent.V1.AgentConfig
end

defmodule Raccoon.Agent.V1.AgentService.Stub do
  @moduledoc false
  use GRPC.Stub, service: Raccoon.Agent.V1.AgentService.Service
end
