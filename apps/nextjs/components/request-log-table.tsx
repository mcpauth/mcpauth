'use client';

import { useEffect, useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

interface McpLog {
  id: string;
  timestamp: string;
  functionName: string;
  parameters: any;
  results: any;
}

const JsonViewer = ({ data }: { data: any }) => {
  if (data === null || data === undefined) return <span className="text-slate-400">null</span>;
  if (typeof data === 'string' && data.trim() === '') return <span className="text-slate-400">Empty String</span>;
  try {
    const jsonString = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    // Attempt to parse to validate, but display the stringified version
    JSON.parse(jsonString);
    return (
      <pre className="whitespace-pre-wrap break-all bg-slate-100 p-3 rounded-md text-xs text-slate-800">
        {jsonString}
      </pre>
    );
  } catch (e) {
    // If it's not valid JSON, display as a plain string
    return (
      <pre className="whitespace-pre-wrap break-all bg-slate-100 p-3 rounded-md text-xs text-slate-800">
        {String(data)}
      </pre>
    );
  }
};

export default function RequestLogTable() {
  const [logs, setLogs] = useState<McpLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/logs');
        if (!response.ok) {
          throw new Error('Failed to fetch logs');
        }
        const data = await response.json();
        setLogs(data.items || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchLogs();
  }, []);

  if (isLoading) {
    return <p className="text-slate-600">Loading logs...</p>;
  }

  if (error) {
    return <p className="text-red-500">Error: {error}</p>;
  }

  if (logs.length === 0) {
    return <p className="text-slate-600">No MCP requests have been logged yet.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
              Timestamp
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
              Function
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
              Parameters
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
              Results
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-slate-200 text-sm">
          {logs.map((log) => (
            <Sheet key={log.id}>
              <SheetTrigger asChild>
                <tr className="cursor-pointer hover:bg-slate-50">
                  <td className="px-4 py-4 whitespace-nowrap text-slate-500">{new Date(log.timestamp).toLocaleString()}</td>
                  <td className="px-4 py-4 whitespace-nowrap font-mono text-slate-800">{log.functionName}</td>
                  <td className="px-4 py-4 font-mono text-xs text-slate-600 truncate max-w-xs">
                    {log.parameters ? JSON.stringify(log.parameters) : 'N/A'}
                  </td>
                  <td className="px-4 py-4 font-mono text-xs text-slate-600 truncate max-w-xs">
                    {log.results ? JSON.stringify(log.results) : 'N/A'}
                  </td>
                </tr>
              </SheetTrigger>
              <SheetContent className="w-full sm:w-3/4 lg:w-1/2 overflow-y-auto p-0">
                <SheetHeader className="p-6 text-left border-b">
                  <SheetTitle className="font-mono text-lg">{log.functionName}</SheetTitle>
                  <SheetDescription>
                    {new Date(log.timestamp).toLocaleString()}
                  </SheetDescription>
                </SheetHeader>
                <div className="p-6 space-y-6">
                  <div>
                    <h4 className="font-semibold text-slate-800 mb-2">Parameters</h4>
                    <JsonViewer data={log.parameters} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-800 mb-2">Results</h4>
                    <JsonViewer data={log.results} />
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          ))}
        </tbody>
      </table>
    </div>
  );
}
