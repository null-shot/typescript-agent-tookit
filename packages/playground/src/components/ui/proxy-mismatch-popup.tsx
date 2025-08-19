import React, { useState, useEffect } from "react";
import { X, AlertTriangle, Copy, CheckCircle, Loader2 } from "lucide-react";

interface ProxyMismatchPopupProps {
  isOpen: boolean;
  onClose: () => void;
  frontendProxyId: string;
  serverProxyId: string;
}

export function ProxyMismatchPopup({
  isOpen,
  onClose,
  frontendProxyId,
  serverProxyId,
}: ProxyMismatchPopupProps) {
  const [copied, setCopied] = useState(false);
  const [isWaiting, setIsWaiting] = useState(false);

  // Reset copy states when modal opens
  useEffect(() => {
    if (isOpen) {
      setCopied(false);
      setIsWaiting(false);
    }
  }, [isOpen]);

  const forceRestartCommand = `docker rm -f mcp-toolbox 2>/dev/null || true && docker run -d -p 11990:11990 --name mcp-toolbox -e PROXY_ID=${frontendProxyId} ghcr.io/null-shot/typescript-agent-framework/mcp-toolbox:pr-50`;

  const copyToClipboard = async (
    text: string,
    setCopyState: (state: boolean) => void
  ) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyState(true);
      setIsWaiting(true);
      setTimeout(() => setCopyState(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div
        className="bg-[#1a1b23] rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        style={{
          border: "1px solid rgba(255, 255, 255, 0.1)",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">
                MCP Toolbox Mismatch Proxy ID
              </h2>
              <p className="text-sm text-white/60 mt-1">
                Your local toolbox needs to be restarted with the correct Proxy
                ID
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Mismatch Details */}
          <div className="bg-[#2D1B69] border border-[#7849EF] rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-[#7849EF]" />
              <span className="text-white font-medium">Proxy ID Mismatch</span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-white/60">Frontend Proxy ID:</span>
                <span className="text-white font-mono">{frontendProxyId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">Server Proxy ID:</span>
                <span className="text-white font-mono">{serverProxyId}</span>
              </div>
            </div>
          </div>

          {/* Run Command Section */}
          <div className="bg-[#323546] rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/60 text-sm">Run this command:</span>
              <button
                onClick={() => copyToClipboard(forceRestartCommand, setCopied)}
                className="flex items-center gap-2 px-3 py-1 bg-[#7849EF]/20 hover:bg-[#7849EF]/30 text-[#7849EF] rounded transition-colors"
              >
                {copied ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            <code className="text-white font-mono text-sm break-all">
              {forceRestartCommand}
            </code>
          </div>

          {/* Waiting Status */}
          {isWaiting && (
            <div className="bg-[#323546] rounded-lg p-4">
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 text-[#7849EF] animate-spin" />
                <span className="text-white font-medium">
                  Waiting for correct MCP toolbox to work...
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-white/10">
          <button
            onClick={onClose}
            className="px-4 py-2 text-white/60 hover:text-white transition-colors"
          >
            Close
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#7849EF] hover:bg-[#7849EF]/90 text-white rounded transition-colors"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
}
