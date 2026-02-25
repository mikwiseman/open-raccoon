import datetime

from google.protobuf import empty_pb2 as _empty_pb2
from google.protobuf import timestamp_pb2 as _timestamp_pb2
from google.protobuf import struct_pb2 as _struct_pb2
from google.protobuf.internal import containers as _containers
from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from collections.abc import Iterable as _Iterable, Mapping as _Mapping
from typing import ClassVar as _ClassVar, Optional as _Optional, Union as _Union

DESCRIPTOR: _descriptor.FileDescriptor

class Message(_message.Message):
    __slots__ = ("role", "content", "message_id", "timestamp", "attachments")
    ROLE_FIELD_NUMBER: _ClassVar[int]
    CONTENT_FIELD_NUMBER: _ClassVar[int]
    MESSAGE_ID_FIELD_NUMBER: _ClassVar[int]
    TIMESTAMP_FIELD_NUMBER: _ClassVar[int]
    ATTACHMENTS_FIELD_NUMBER: _ClassVar[int]
    role: str
    content: str
    message_id: str
    timestamp: _timestamp_pb2.Timestamp
    attachments: _containers.RepeatedCompositeFieldContainer[Attachment]
    def __init__(self, role: _Optional[str] = ..., content: _Optional[str] = ..., message_id: _Optional[str] = ..., timestamp: _Optional[_Union[datetime.datetime, _timestamp_pb2.Timestamp, _Mapping]] = ..., attachments: _Optional[_Iterable[_Union[Attachment, _Mapping]]] = ...) -> None: ...

class Attachment(_message.Message):
    __slots__ = ("filename", "mime_type", "data", "url")
    FILENAME_FIELD_NUMBER: _ClassVar[int]
    MIME_TYPE_FIELD_NUMBER: _ClassVar[int]
    DATA_FIELD_NUMBER: _ClassVar[int]
    URL_FIELD_NUMBER: _ClassVar[int]
    filename: str
    mime_type: str
    data: bytes
    url: str
    def __init__(self, filename: _Optional[str] = ..., mime_type: _Optional[str] = ..., data: _Optional[bytes] = ..., url: _Optional[str] = ...) -> None: ...

class AgentRequest(_message.Message):
    __slots__ = ("conversation_id", "agent_id", "messages", "config", "user_api_key", "request_id")
    CONVERSATION_ID_FIELD_NUMBER: _ClassVar[int]
    AGENT_ID_FIELD_NUMBER: _ClassVar[int]
    MESSAGES_FIELD_NUMBER: _ClassVar[int]
    CONFIG_FIELD_NUMBER: _ClassVar[int]
    USER_API_KEY_FIELD_NUMBER: _ClassVar[int]
    REQUEST_ID_FIELD_NUMBER: _ClassVar[int]
    conversation_id: str
    agent_id: str
    messages: _containers.RepeatedCompositeFieldContainer[Message]
    config: AgentConfig
    user_api_key: str
    request_id: str
    def __init__(self, conversation_id: _Optional[str] = ..., agent_id: _Optional[str] = ..., messages: _Optional[_Iterable[_Union[Message, _Mapping]]] = ..., config: _Optional[_Union[AgentConfig, _Mapping]] = ..., user_api_key: _Optional[str] = ..., request_id: _Optional[str] = ...) -> None: ...

class AgentResponse(_message.Message):
    __slots__ = ("token", "status", "tool_call", "tool_result", "code_block", "error", "approval_request", "complete")
    TOKEN_FIELD_NUMBER: _ClassVar[int]
    STATUS_FIELD_NUMBER: _ClassVar[int]
    TOOL_CALL_FIELD_NUMBER: _ClassVar[int]
    TOOL_RESULT_FIELD_NUMBER: _ClassVar[int]
    CODE_BLOCK_FIELD_NUMBER: _ClassVar[int]
    ERROR_FIELD_NUMBER: _ClassVar[int]
    APPROVAL_REQUEST_FIELD_NUMBER: _ClassVar[int]
    COMPLETE_FIELD_NUMBER: _ClassVar[int]
    token: TokenEvent
    status: StatusEvent
    tool_call: ToolCallEvent
    tool_result: ToolResultEvent
    code_block: CodeBlockEvent
    error: ErrorEvent
    approval_request: ApprovalRequestEvent
    complete: CompleteEvent
    def __init__(self, token: _Optional[_Union[TokenEvent, _Mapping]] = ..., status: _Optional[_Union[StatusEvent, _Mapping]] = ..., tool_call: _Optional[_Union[ToolCallEvent, _Mapping]] = ..., tool_result: _Optional[_Union[ToolResultEvent, _Mapping]] = ..., code_block: _Optional[_Union[CodeBlockEvent, _Mapping]] = ..., error: _Optional[_Union[ErrorEvent, _Mapping]] = ..., approval_request: _Optional[_Union[ApprovalRequestEvent, _Mapping]] = ..., complete: _Optional[_Union[CompleteEvent, _Mapping]] = ...) -> None: ...

class TokenEvent(_message.Message):
    __slots__ = ("text",)
    TEXT_FIELD_NUMBER: _ClassVar[int]
    text: str
    def __init__(self, text: _Optional[str] = ...) -> None: ...

class StatusEvent(_message.Message):
    __slots__ = ("message", "category")
    MESSAGE_FIELD_NUMBER: _ClassVar[int]
    CATEGORY_FIELD_NUMBER: _ClassVar[int]
    message: str
    category: str
    def __init__(self, message: _Optional[str] = ..., category: _Optional[str] = ...) -> None: ...

class ToolCallEvent(_message.Message):
    __slots__ = ("tool_call_id", "tool_name", "arguments")
    TOOL_CALL_ID_FIELD_NUMBER: _ClassVar[int]
    TOOL_NAME_FIELD_NUMBER: _ClassVar[int]
    ARGUMENTS_FIELD_NUMBER: _ClassVar[int]
    tool_call_id: str
    tool_name: str
    arguments: _struct_pb2.Struct
    def __init__(self, tool_call_id: _Optional[str] = ..., tool_name: _Optional[str] = ..., arguments: _Optional[_Union[_struct_pb2.Struct, _Mapping]] = ...) -> None: ...

class ToolResultEvent(_message.Message):
    __slots__ = ("tool_call_id", "tool_name", "success", "output", "error_message")
    TOOL_CALL_ID_FIELD_NUMBER: _ClassVar[int]
    TOOL_NAME_FIELD_NUMBER: _ClassVar[int]
    SUCCESS_FIELD_NUMBER: _ClassVar[int]
    OUTPUT_FIELD_NUMBER: _ClassVar[int]
    ERROR_MESSAGE_FIELD_NUMBER: _ClassVar[int]
    tool_call_id: str
    tool_name: str
    success: bool
    output: str
    error_message: str
    def __init__(self, tool_call_id: _Optional[str] = ..., tool_name: _Optional[str] = ..., success: bool = ..., output: _Optional[str] = ..., error_message: _Optional[str] = ...) -> None: ...

class CodeBlockEvent(_message.Message):
    __slots__ = ("language", "code", "filename")
    LANGUAGE_FIELD_NUMBER: _ClassVar[int]
    CODE_FIELD_NUMBER: _ClassVar[int]
    FILENAME_FIELD_NUMBER: _ClassVar[int]
    language: str
    code: str
    filename: str
    def __init__(self, language: _Optional[str] = ..., code: _Optional[str] = ..., filename: _Optional[str] = ...) -> None: ...

class ErrorEvent(_message.Message):
    __slots__ = ("code", "message", "recoverable")
    CODE_FIELD_NUMBER: _ClassVar[int]
    MESSAGE_FIELD_NUMBER: _ClassVar[int]
    RECOVERABLE_FIELD_NUMBER: _ClassVar[int]
    code: str
    message: str
    recoverable: bool
    def __init__(self, code: _Optional[str] = ..., message: _Optional[str] = ..., recoverable: bool = ...) -> None: ...

class ApprovalRequestEvent(_message.Message):
    __slots__ = ("approval_id", "tool_name", "arguments", "reason")
    APPROVAL_ID_FIELD_NUMBER: _ClassVar[int]
    TOOL_NAME_FIELD_NUMBER: _ClassVar[int]
    ARGUMENTS_FIELD_NUMBER: _ClassVar[int]
    REASON_FIELD_NUMBER: _ClassVar[int]
    approval_id: str
    tool_name: str
    arguments: _struct_pb2.Struct
    reason: str
    def __init__(self, approval_id: _Optional[str] = ..., tool_name: _Optional[str] = ..., arguments: _Optional[_Union[_struct_pb2.Struct, _Mapping]] = ..., reason: _Optional[str] = ...) -> None: ...

class CompleteEvent(_message.Message):
    __slots__ = ("input_tokens", "output_tokens", "model", "stop_reason")
    INPUT_TOKENS_FIELD_NUMBER: _ClassVar[int]
    OUTPUT_TOKENS_FIELD_NUMBER: _ClassVar[int]
    MODEL_FIELD_NUMBER: _ClassVar[int]
    STOP_REASON_FIELD_NUMBER: _ClassVar[int]
    input_tokens: int
    output_tokens: int
    model: str
    stop_reason: str
    def __init__(self, input_tokens: _Optional[int] = ..., output_tokens: _Optional[int] = ..., model: _Optional[str] = ..., stop_reason: _Optional[str] = ...) -> None: ...

class AgentConfigRequest(_message.Message):
    __slots__ = ("agent_id",)
    AGENT_ID_FIELD_NUMBER: _ClassVar[int]
    agent_id: str
    def __init__(self, agent_id: _Optional[str] = ...) -> None: ...

class AgentConfig(_message.Message):
    __slots__ = ("agent_id", "system_prompt", "model", "temperature", "max_tokens", "tools", "visibility")
    AGENT_ID_FIELD_NUMBER: _ClassVar[int]
    SYSTEM_PROMPT_FIELD_NUMBER: _ClassVar[int]
    MODEL_FIELD_NUMBER: _ClassVar[int]
    TEMPERATURE_FIELD_NUMBER: _ClassVar[int]
    MAX_TOKENS_FIELD_NUMBER: _ClassVar[int]
    TOOLS_FIELD_NUMBER: _ClassVar[int]
    VISIBILITY_FIELD_NUMBER: _ClassVar[int]
    agent_id: str
    system_prompt: str
    model: str
    temperature: float
    max_tokens: int
    tools: _containers.RepeatedCompositeFieldContainer[ToolConfig]
    visibility: str
    def __init__(self, agent_id: _Optional[str] = ..., system_prompt: _Optional[str] = ..., model: _Optional[str] = ..., temperature: _Optional[float] = ..., max_tokens: _Optional[int] = ..., tools: _Optional[_Iterable[_Union[ToolConfig, _Mapping]]] = ..., visibility: _Optional[str] = ...) -> None: ...

class ToolConfig(_message.Message):
    __slots__ = ("name", "description", "input_schema", "requires_approval")
    NAME_FIELD_NUMBER: _ClassVar[int]
    DESCRIPTION_FIELD_NUMBER: _ClassVar[int]
    INPUT_SCHEMA_FIELD_NUMBER: _ClassVar[int]
    REQUIRES_APPROVAL_FIELD_NUMBER: _ClassVar[int]
    name: str
    description: str
    input_schema: _struct_pb2.Struct
    requires_approval: bool
    def __init__(self, name: _Optional[str] = ..., description: _Optional[str] = ..., input_schema: _Optional[_Union[_struct_pb2.Struct, _Mapping]] = ..., requires_approval: bool = ...) -> None: ...

class ValidateToolsRequest(_message.Message):
    __slots__ = ("tools",)
    TOOLS_FIELD_NUMBER: _ClassVar[int]
    tools: _containers.RepeatedCompositeFieldContainer[ToolConfig]
    def __init__(self, tools: _Optional[_Iterable[_Union[ToolConfig, _Mapping]]] = ...) -> None: ...

class ValidateToolsResponse(_message.Message):
    __slots__ = ("valid", "errors")
    VALID_FIELD_NUMBER: _ClassVar[int]
    ERRORS_FIELD_NUMBER: _ClassVar[int]
    valid: bool
    errors: _containers.RepeatedCompositeFieldContainer[ToolValidationError]
    def __init__(self, valid: bool = ..., errors: _Optional[_Iterable[_Union[ToolValidationError, _Mapping]]] = ...) -> None: ...

class ToolValidationError(_message.Message):
    __slots__ = ("tool_name", "error")
    TOOL_NAME_FIELD_NUMBER: _ClassVar[int]
    ERROR_FIELD_NUMBER: _ClassVar[int]
    tool_name: str
    error: str
    def __init__(self, tool_name: _Optional[str] = ..., error: _Optional[str] = ...) -> None: ...

class CreateSandboxRequest(_message.Message):
    __slots__ = ("conversation_id", "template", "limits")
    CONVERSATION_ID_FIELD_NUMBER: _ClassVar[int]
    TEMPLATE_FIELD_NUMBER: _ClassVar[int]
    LIMITS_FIELD_NUMBER: _ClassVar[int]
    conversation_id: str
    template: str
    limits: SandboxLimits
    def __init__(self, conversation_id: _Optional[str] = ..., template: _Optional[str] = ..., limits: _Optional[_Union[SandboxLimits, _Mapping]] = ...) -> None: ...

class SandboxLimits(_message.Message):
    __slots__ = ("max_cpu", "max_memory_mb", "timeout_seconds")
    MAX_CPU_FIELD_NUMBER: _ClassVar[int]
    MAX_MEMORY_MB_FIELD_NUMBER: _ClassVar[int]
    TIMEOUT_SECONDS_FIELD_NUMBER: _ClassVar[int]
    max_cpu: int
    max_memory_mb: int
    timeout_seconds: int
    def __init__(self, max_cpu: _Optional[int] = ..., max_memory_mb: _Optional[int] = ..., timeout_seconds: _Optional[int] = ...) -> None: ...

class SandboxInfo(_message.Message):
    __slots__ = ("sandbox_id", "conversation_id", "template", "status", "preview_url", "created_at", "limits")
    SANDBOX_ID_FIELD_NUMBER: _ClassVar[int]
    CONVERSATION_ID_FIELD_NUMBER: _ClassVar[int]
    TEMPLATE_FIELD_NUMBER: _ClassVar[int]
    STATUS_FIELD_NUMBER: _ClassVar[int]
    PREVIEW_URL_FIELD_NUMBER: _ClassVar[int]
    CREATED_AT_FIELD_NUMBER: _ClassVar[int]
    LIMITS_FIELD_NUMBER: _ClassVar[int]
    sandbox_id: str
    conversation_id: str
    template: str
    status: str
    preview_url: str
    created_at: _timestamp_pb2.Timestamp
    limits: SandboxLimits
    def __init__(self, sandbox_id: _Optional[str] = ..., conversation_id: _Optional[str] = ..., template: _Optional[str] = ..., status: _Optional[str] = ..., preview_url: _Optional[str] = ..., created_at: _Optional[_Union[datetime.datetime, _timestamp_pb2.Timestamp, _Mapping]] = ..., limits: _Optional[_Union[SandboxLimits, _Mapping]] = ...) -> None: ...

class ExecuteCodeRequest(_message.Message):
    __slots__ = ("sandbox_id", "code", "language", "timeout_seconds")
    SANDBOX_ID_FIELD_NUMBER: _ClassVar[int]
    CODE_FIELD_NUMBER: _ClassVar[int]
    LANGUAGE_FIELD_NUMBER: _ClassVar[int]
    TIMEOUT_SECONDS_FIELD_NUMBER: _ClassVar[int]
    sandbox_id: str
    code: str
    language: str
    timeout_seconds: int
    def __init__(self, sandbox_id: _Optional[str] = ..., code: _Optional[str] = ..., language: _Optional[str] = ..., timeout_seconds: _Optional[int] = ...) -> None: ...

class ExecutionOutput(_message.Message):
    __slots__ = ("stdout", "stderr", "result", "error")
    STDOUT_FIELD_NUMBER: _ClassVar[int]
    STDERR_FIELD_NUMBER: _ClassVar[int]
    RESULT_FIELD_NUMBER: _ClassVar[int]
    ERROR_FIELD_NUMBER: _ClassVar[int]
    stdout: str
    stderr: str
    result: ExecutionResult
    error: ExecutionError
    def __init__(self, stdout: _Optional[str] = ..., stderr: _Optional[str] = ..., result: _Optional[_Union[ExecutionResult, _Mapping]] = ..., error: _Optional[_Union[ExecutionError, _Mapping]] = ...) -> None: ...

class ExecutionResult(_message.Message):
    __slots__ = ("exit_code", "output", "files")
    EXIT_CODE_FIELD_NUMBER: _ClassVar[int]
    OUTPUT_FIELD_NUMBER: _ClassVar[int]
    FILES_FIELD_NUMBER: _ClassVar[int]
    exit_code: int
    output: str
    files: _containers.RepeatedCompositeFieldContainer[OutputFile]
    def __init__(self, exit_code: _Optional[int] = ..., output: _Optional[str] = ..., files: _Optional[_Iterable[_Union[OutputFile, _Mapping]]] = ...) -> None: ...

class ExecutionError(_message.Message):
    __slots__ = ("code", "message")
    CODE_FIELD_NUMBER: _ClassVar[int]
    MESSAGE_FIELD_NUMBER: _ClassVar[int]
    code: str
    message: str
    def __init__(self, code: _Optional[str] = ..., message: _Optional[str] = ...) -> None: ...

class OutputFile(_message.Message):
    __slots__ = ("path", "mime_type", "data")
    PATH_FIELD_NUMBER: _ClassVar[int]
    MIME_TYPE_FIELD_NUMBER: _ClassVar[int]
    DATA_FIELD_NUMBER: _ClassVar[int]
    path: str
    mime_type: str
    data: bytes
    def __init__(self, path: _Optional[str] = ..., mime_type: _Optional[str] = ..., data: _Optional[bytes] = ...) -> None: ...

class UploadFileRequest(_message.Message):
    __slots__ = ("sandbox_id", "path", "data", "mime_type")
    SANDBOX_ID_FIELD_NUMBER: _ClassVar[int]
    PATH_FIELD_NUMBER: _ClassVar[int]
    DATA_FIELD_NUMBER: _ClassVar[int]
    MIME_TYPE_FIELD_NUMBER: _ClassVar[int]
    sandbox_id: str
    path: str
    data: bytes
    mime_type: str
    def __init__(self, sandbox_id: _Optional[str] = ..., path: _Optional[str] = ..., data: _Optional[bytes] = ..., mime_type: _Optional[str] = ...) -> None: ...

class UploadFileResponse(_message.Message):
    __slots__ = ("path", "size_bytes")
    PATH_FIELD_NUMBER: _ClassVar[int]
    SIZE_BYTES_FIELD_NUMBER: _ClassVar[int]
    path: str
    size_bytes: int
    def __init__(self, path: _Optional[str] = ..., size_bytes: _Optional[int] = ...) -> None: ...

class DestroySandboxRequest(_message.Message):
    __slots__ = ("sandbox_id",)
    SANDBOX_ID_FIELD_NUMBER: _ClassVar[int]
    sandbox_id: str
    def __init__(self, sandbox_id: _Optional[str] = ...) -> None: ...
