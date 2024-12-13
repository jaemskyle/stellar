import React, { useEffect, useRef, useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ItemType } from '@openai/realtime-api-beta/dist/lib/client.js';
import { AudioPlayer } from '@/components/ui/AudioPlayer';
import { logger } from '@/utils/logger';

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
      className="w-full max-w-4xl min-h-[500px] h-[800px] border border-gray-200 dark:border-gray-800 rounded-xl bg-white/50 dark:bg-black/50 backdrop-blur-xl shadow-sm overflow-auto flex-wrap mx-auto"
    >
      <div className="p-6 space-y-4">
        {!items.length ? (
          <EmptyConversation />
        ) : (
          items.map(item => (
            // <div key={item.id}>
            //   <div>{JSON.stringify(item.id) }</div> {/* Display item as a string */}
            <ConversationItem
              key={item.id}
              item={item}
              onDelete={() => onDeleteItem(item.id)}
            />
            // </div>
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
  const getRoleLabel = () => {
    switch (item.role) {
      case 'user':
        return 'you';
      case 'assistant':
        return 'james';
      default:
        return (item.role || item.type).replaceAll('_', ' ');
    }
  };

  const getContent = () => {
    // if (item.type === 'function_call_output') {
    //   return null;
    // }

    // if (item.formatted.tool) {
    //   return (
    //     <div className="text-sm text-gray-600 dark:text-gray-300 break-words whitespace-pre-wrap flex-wrap">
    //       {item.formatted.tool.name}({item.formatted.tool.arguments})
    //     </div>
    //   );
    // }
    logger.debug('[DEBUG] --jb ConversationItem item:', item);

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
        return 'bg-gray-50/80 dark:bg-gray-900/50 border-gray-100 dark:border-gray-800/50';
      case 'assistant':
        return 'bg-green-50/80 dark:bg-green-900/30 border-green-100/50 dark:border-green-800/30';
      default:
        return 'bg-blue-50/80 dark:bg-blue-900/30 border-blue-100/50 dark:border-blue-800/30';
    }
  };

  return (
    <div
      className={`group animate-fade-in transition-transform duration-200 ease-out ${
        item.role === 'user'
          ? 'flex flex-col items-end'
          : 'flex flex-col items-start'
      }`}
    >
      <div
        className={`relative border rounded-2xl overflow-hidden transition-all duration-200 hover:shadow-sm ${getRoleStyles()} ${
          item.role === 'user' ? 'max-w-[80%] min-w-[300px]' : 'max-w-full'
        }`}
      >
        <div className="px-4 py-2.5 flex items-center justify-between border-b border-inherit/50">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-medium tracking-wide text-gray-600/90 dark:text-gray-300/90">
              {getRoleLabel()}
            </span>
          </div>
          <button
            onClick={onDelete}
            className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity duration-200 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <svg
              className="w-3.5 h-3.5"
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
          <div className="text-gray-800 dark:text-gray-200 max-w-full overflow-hidden text-[0.9375rem]">
            {getContent()}
          </div>
        </div>
      </div>
      {/* Audio player moved outside the message box */}
      {item.formatted.file && <AudioPlayer file={item.formatted.file} />}
    </div>
  );
}
