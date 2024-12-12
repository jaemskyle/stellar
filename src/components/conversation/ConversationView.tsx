import React, { useEffect, useRef, useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ItemType } from '@openai/realtime-api-beta/dist/lib/client.js';
import { AudioPlayer } from '@/components/ui/AudioPlayer';

interface ConversationViewProps {
  /**
   * Array of conversation items to display
   */
  items: ItemType[];

  /**
   * Whether to show the conversation view
   */
  showConversation: boolean;

  /**
   * Callback to delete a conversation item
   */
  onDeleteItem: (id: string) => void;
}

/**
 * ConversationView displays a scrollable list of conversation items with auto-scroll functionality.
 * It handles both user and assistant messages, function calls, and their outputs.
 *
 * @example
 * ```tsx
 * <ConversationView
 *   items={conversationItems}
 *   showConversation={true}
 *   onDeleteItem={handleDeleteItem}
 * />
 * ```
 */
export function ConversationView({
  items,
  showConversation,
  onDeleteItem,
}: ConversationViewProps) {
  // Reference to the scroll container
  const scrollRef = useRef<HTMLDivElement>(null);

  // State to control auto-scrolling behavior
  const [autoScroll, setAutoScroll] = useState(true);

  // Auto-scroll effect when items change or autoScroll is enabled
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      const scrollElement = scrollRef.current;
      scrollElement.scrollTop = scrollElement.scrollHeight;
    }
  }, [items, autoScroll]);

  // Handle scroll events to determine if we should continue auto-scrolling
  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
    // If user is near bottom (within 50px), enable auto-scroll
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 50;
    setAutoScroll(isNearBottom);
  };

  // Don't render anything if conversation should be hidden
  if (!showConversation) return null;

  return (
    <ScrollArea
      ref={scrollRef}
      onScroll={handleScroll}
      className="w-full h-[500px] border border-gray-200 dark:border-gray-800 rounded-xl bg-white/50 dark:bg-black/50 backdrop-blur-xl shadow-sm overflow-auto flex-wrap"
    >
      <div className="p-6 space-y-4">
        {!items.length ? (
          <EmptyConversation />
        ) : (
          items.map(item => (
            <ConversationItem
              key={item.id}
              item={item}
              onDelete={() => onDeleteItem(item.id)}
            />
          ))
        )}
      </div>
    </ScrollArea>
  );
}

/**
 * EmptyConversation is shown when there are no messages yet
 */
function EmptyConversation() {
  return (
    <div className="flex items-center justify-center h-full flex-wrap">
      <div className="text-center text-gray-500 dark:text-gray-400">
        <div className="mb-2 text-lg font-medium">No messages yet</div>
        <div className="text-sm">Your conversation will appear here</div>
      </div>
    </div>
  );
}

interface ConversationItemProps {
  item: ItemType;
  onDelete: () => void;
}

/**
 * ConversationItem renders a single conversation message with appropriate styling
 * based on whether it's from the user, assistant, or system.
 */
function ConversationItem({ item, onDelete }: ConversationItemProps) {
  const getContent = () => {
    if (item.type === 'function_call_output') {
      return null;
    }

    if (item.formatted.tool) {
      return (
        <div className="text-sm text-gray-600 dark:text-gray-300 break-words whitespace-pre-wrap flex-wrap">
          {item.formatted.tool.name}({item.formatted.tool.arguments})
        </div>
      );
    }

    if (item.role === 'user') {
      return (
        <div className="text-sm break-words whitespace-pre-wrap flex-wrap">
          {item.formatted.transcript ||
            (item.formatted.audio?.length
              ? '(awaiting transcript)'
              : item.formatted.text || '(item sent)')}
        </div>
      );
    }

    if (item.role === 'assistant') {
      return (
        <div className="text-sm break-words whitespace-pre-wrap flex-wrap">
          {item.formatted.transcript || item.formatted.text || '(truncated)'}
        </div>
      );
    }

    return null;
  };

  const getRoleStyles = () => {
    switch (item.role) {
      case 'system':
        return 'bg-gray-50 dark:bg-gray-900 border-gray-100 dark:border-gray-800';
      case 'assistant':
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800/30';
      default:
        return 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800/30';
    }
  };

  return (
    <div className="group animate-fade-in">
      <div
        className={`relative border rounded-lg overflow-hidden transition-all ${getRoleStyles()}`}
      >
        <div className="px-4 py-3 flex items-center justify-between border-b border-inherit">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-medium uppercase tracking-wider text-gray-600 dark:text-gray-300">
              {(item.role || item.type).replaceAll('_', ' ')}
            </span>
          </div>
          <button
            onClick={onDelete}
            className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <div className="p-4">
          <div className="text-gray-800 dark:text-gray-200 max-w-full overflow-hidden">
            {getContent()}
          </div>
          {item.formatted.file && (
            <div className="mt-2">
              <AudioPlayer file={item.formatted.file} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
