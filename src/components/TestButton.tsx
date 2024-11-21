import { Button } from '@/components/ui/button';

export default function TestButton({ children }: { children: React.ReactNode }) {
  return (
    <Button className="bg-white text-gray-800 hover:bg-blue-500 hover:text-white transition-colors duration-200">
      {children}
    </Button>
  );
}
