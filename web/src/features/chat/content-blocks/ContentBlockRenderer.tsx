"use client";

import { TextBlock, type TextBlockData } from "./TextBlock";
import { ToolCallBlock, type ToolCallBlockData } from "./ToolCallBlock";
import { ToolResultBlock, type ToolResultBlockData } from "./ToolResultBlock";
import { CodeBlock, type CodeBlockData } from "./CodeBlock";
import { ThinkingBlock, type ThinkingBlockData } from "./ThinkingBlock";
import { ProposalBlock, type ProposalBlockData } from "./ProposalBlock";
import { ProgressBlock, type ProgressBlockData } from "./ProgressBlock";
import { ImageBlock, type ImageBlockData } from "./ImageBlock";
import { FileBlock, type FileBlockData } from "./FileBlock";
import { TableBlock, type TableBlockData } from "./TableBlock";
import { ActionCardBlock, type ActionCardBlockData } from "./ActionCardBlock";

export type ContentBlock =
  | TextBlockData
  | ToolCallBlockData
  | ToolResultBlockData
  | CodeBlockData
  | ThinkingBlockData
  | ProposalBlockData
  | ProgressBlockData
  | ImageBlockData
  | FileBlockData
  | TableBlockData
  | ActionCardBlockData;

type ContentBlockRendererProps = {
  blocks: ContentBlock[];
};

export function ContentBlockRenderer({ blocks }: ContentBlockRendererProps) {
  if (blocks.length === 0) {
    return null;
  }

  return (
    <div className="cb-renderer">
      {blocks.map((block, i) => (
        <ContentBlockItem key={`${block.type}-${i}`} block={block} />
      ))}
    </div>
  );
}

function ContentBlockItem({ block }: { block: ContentBlock }) {
  switch (block.type) {
    case "text":
      return <TextBlock block={block} />;
    case "tool_call":
      return <ToolCallBlock block={block} />;
    case "tool_result":
      return <ToolResultBlock block={block} />;
    case "code":
      return <CodeBlock block={block} />;
    case "thinking":
      return <ThinkingBlock block={block} />;
    case "proposal":
      return <ProposalBlock block={block} />;
    case "progress":
      return <ProgressBlock block={block} />;
    case "image":
      return <ImageBlock block={block} />;
    case "file":
      return <FileBlock block={block} />;
    case "table":
      return <TableBlock block={block} />;
    case "action_card":
      return <ActionCardBlock block={block} />;
    default: {
      // Render unknown block type as JSON
      const unknown = block as Record<string, unknown>;
      return (
        <div className="cb-unknown-block">
          <pre>{JSON.stringify(unknown, null, 2)}</pre>
        </div>
      );
    }
  }
}

/**
 * Parse message content into content blocks.
 * Handles:
 * - JSON arrays of content blocks
 * - Legacy { text: string } objects
 * - Plain strings
 */
export function parseContentBlocks(content: unknown): ContentBlock[] {
  if (!content) {
    return [];
  }

  // If it's a string, try to parse as JSON first
  if (typeof content === "string") {
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        return parsed as ContentBlock[];
      }
      // If it's an object with a "type" field, wrap in array
      if (parsed && typeof parsed === "object" && "type" in parsed) {
        return [parsed as ContentBlock];
      }
    } catch {
      // Not JSON, treat as plain text
    }
    return [{ type: "text", text: content }];
  }

  // If it's already an array, use directly
  if (Array.isArray(content)) {
    return content as ContentBlock[];
  }

  // If it's an object, check for content block structure
  if (typeof content === "object" && content !== null) {
    const obj = content as Record<string, unknown>;

    // If it has a "type" field, it's a single content block
    if (typeof obj.type === "string") {
      return [obj as unknown as ContentBlock];
    }

    // Legacy: { text: "..." } format
    if (typeof obj.text === "string") {
      return [{ type: "text", text: obj.text }];
    }

    // Legacy: { blocks: [...] } wrapper
    if (Array.isArray(obj.blocks)) {
      return obj.blocks as ContentBlock[];
    }
  }

  return [];
}
