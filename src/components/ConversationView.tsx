import React, { useRef, useEffect, useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ItemType } from '@openai/realtime-api-beta/dist/lib/client.js';
import { motion, AnimatePresence } from 'framer-motion';

interface ConversationViewProps {
  items: ItemType[];
  showConversation: boolean;
  onDeleteItem: (id: string) => void;
}

const ConversationItem: React.FC<{
  item: ItemType;
  onDelete: () => void;
}> = ({ item, onDelete }) => {
  const getContent = () => {
    // if (item.type === 'function_call_output') {
    //   return (
    //     <div className="text-sm text-gray-600 dark:text-gray-300 break-words whitespace-pre-wrap">
    //       {JSON.stringify(item.formatted.output, null, 2)}
    //     </div>
    //   );
    // }

    // if (item.formatted.tool) {
    //   return (
    //     <div className="text-sm text-gray-600 dark:text-gray-300 break-words whitespace-pre-wrap">
    //       {item.formatted.tool.name}(
    //       {JSON.stringify(item.formatted.tool.arguments, null, 2)})
    //     </div>
    //   );
    // }

    if (item.role === 'user') {
      return (
        <div className="text-sm break-words whitespace-pre-wrap">
          {item.formatted.transcript ||
            (item.formatted.audio?.length
              ? '(awaiting transcript)'
              : item.formatted.text || '(item sent)')}
        </div>
      );
    }

    if (item.role === 'assistant') {
      return (
        <div className="text-sm break-words whitespace-pre-wrap">
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
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="group"
    >
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
        <div className="p-4 max-w-full overflow-x-auto">
          <div className="text-gray-800 dark:text-gray-200 max-w-full">
            {getContent()}
          </div>
          {item.formatted.file && (
            <div className="mt-2">
              <audio
                src={item.formatted.file.url}
                controls
                className="max-w-full"
                // className="w-full max-w-xs"
              />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export const ConversationView: React.FC<ConversationViewProps> = ({
  items,
  showConversation,
  onDeleteItem,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const lastItemIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Only auto-scroll if new items were added
    if (!items.length) return;
    const lastItem = items[items.length - 1];
    if (lastItemIdRef.current !== lastItem.id) {
      lastItemIdRef.current = lastItem.id;
      if (autoScroll && scrollRef.current) {
        requestAnimationFrame(() => {
          if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
          }
        });
      }
    }
  }, [items, autoScroll]);

  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 50;
    setAutoScroll(isNearBottom);
  };

  if (!showConversation) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ type: 'spring', bounce: 0, duration: 0.5 }}
      className="w-full flex-1 min-h-0 flex flex-col"
      // className="w-full h-[500px] border border-gray-200 dark:border-gray-800 rounded-xl bg-white/50 dark:bg-black/50 backdrop-blur-xl shadow-sm overflow-auto flex-wrap"
    >
      <ScrollArea className="h-full rounded-xl border bg-white/50 dark:bg-black/50 backdrop-blur-xl shadow-sm">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="p-6 space-y-4 h-full overflow-auto"
        >
          <AnimatePresence initial={false}>
            {items.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center justify-center h-full"
              >
                <div className="text-center text-gray-500 dark:text-gray-400">
                  <div className="mb-2 text-lg font-medium">
                    No messages yet
                  </div>
                  <div className="text-sm">
                    Your conversation will appear here
                  </div>
                </div>
              </motion.div>
            ) : (
              items
                .filter(
                  item => item.role === 'user' || item.role === 'assistant'
                )
                .map(item => (
                  <ConversationItem
                    key={item.id}
                    item={item}
                    onDelete={() => onDeleteItem(item.id)}
                  />
                ))
            )}
          </AnimatePresence>
        </div>
      </ScrollArea>
    </motion.div>
  );
};
