'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface ConnectedClientsProps {
  clients: string[];
  instructionsVisible: boolean;
}

const ConnectionInstructions = () => (
  <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
    <ol className="list-decimal space-y-3 pl-5 text-slate-600">
      <li>Open ChatGPT.</li>
      <li>
        Click <strong>"Tools"</strong> under the input field.
      </li>
      <li>
        Select <strong>"Run Deep Research"</strong>.
      </li>
      <li>
        Choose <strong>"Add Sources"</strong> and click{" "}
        <strong>"Connect More"</strong>.
      </li>
      <li>
        Click <strong>"Create"</strong> next to{" "}
        <strong>"Browse Connectors"</strong>.
      </li>
      <li>
        Fill out the connector's details: provide name,
        description, and MCP Server URL:{" "}
        <code className="font-mono bg-gray-100 p-1 rounded-md">{`${process.env.NEXT_PUBLIC_BASE_URL}/api/sse`}</code>
        .
      </li>
      <li>
        Select <strong>"OAuth Authentication"</strong>, toggle{" "}
        <strong>"I trust this application"</strong>, and click{" "}
        <strong>"Create"</strong>.
      </li>
      <li>
        Complete the OAuth flow to integrate the connector into
        your ChatGPT environment.
      </li>
    </ol>
  </div>
);

export default function ConnectedClients({ clients, instructionsVisible: defaultVisible }: ConnectedClientsProps) {
  const [isInstructionsVisible, setIsInstructionsVisible] = useState(defaultVisible);

  return (
    <div>
      <p className="mt-2 text-slate-600">
        Once you have deployed this project, you can connect it to
        ChatGPT's Deep Research mode to allow AI models to access
        resources on your behalf.
      </p>

      {clients.length > 0 && (
        <div className="mt-4">
          <h4 className="font-semibold text-slate-700">Connected Applications:</h4>
          <ul className="mt-2 list-disc list-inside rounded-lg border border-slate-200 bg-slate-50 p-4 text-slate-600">
            {clients.map((client) => (
              <li key={client}>{client}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4">
        <button
          onClick={() => setIsInstructionsVisible(!isInstructionsVisible)}
          className="flex w-full items-center text-sm font-semibold text-slate-800 hover:text-slate-600"
        >
          {isInstructionsVisible ? <ChevronDown className="h-4 w-4 mr-1" /> : <ChevronRight className="h-4 w-4 mr-1" />}
          <span>Connection Instructions</span>
        </button>
        {isInstructionsVisible && <ConnectionInstructions />}
      </div>
    </div>
  );
}
