import React, { useState, useEffect, useRef } from 'react';
import { Network, Brain, Sparkles, Loader2 } from 'lucide-react';
import { chatWithAssistant } from '../lib/ai';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import toast from 'react-hot-toast';

// Define icons for primary nodes
const nodeIcons = {
  "Powerhouse of the Cell": "⚡",
  "Main Function: ATP Production": "🔋",
  "Cellular Respiration": "💨",
  "Independent Reproduction": "🌱",
  "Own DNA": "🧬",
  "Double Membrane Structure": "🌐",
  "Inner Membrane (Cristae)": "〰️",
  "Endosymbiosis Origin": "🔄",
  "Membrane-bound organelle": "🛡️",
  "Found in Eukaryotic Cells": "🔬",
  "intermediary": "🤝",
  "middleman": "🔗",
  "contracting parties": "📜",
  "futures market": "📈",
  "credit guarantee": "💳",
  "buyer and seller": "🛍️",
  "futures contract": "✍️"
};

export const MindMap: React.FC = () => {
  const [note, setNote] = useState('');
  const [mindMap, setMindMap] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);

  // Refs for nodes to calculate positions for SVG lines
  const centralNodeRef = useRef<HTMLDivElement>(null);
  const primaryNodeRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});
  const mindMapContainerRef = useRef<HTMLDivElement>(null);

  // Function to generate mind map using AI
  const generateMindMap = async (inputNote = note) => {
    if (!inputNote.trim()) {
      setError("Please enter a note to generate a mind map.");
      return;
    }

    setLoading(true);
    setError(null);
    setMindMap(null);
    setSummary(null);
    primaryNodeRefs.current = {};

    try {
      const prompt = `Generate a detailed mind map structure (main topic and primary ideas). Focus on extracting key concepts and their relationships. Return the output as a JSON object with a 'mainTopic' string and an 'ideas' array. Each item in 'ideas' should have a 'concept' string.

Example for a note about "Mitochondria":
{
  "mainTopic": "Mitochondria",
  "ideas": [
    {"concept": "Powerhouse of the Cell"},
    {"concept": "Main Function: ATP Production"},
    {"concept": "Cellular Respiration"},
    {"concept": "Independent Reproduction"},
    {"concept": "Own DNA"},
    {"concept": "Double Membrane Structure"},
    {"concept": "Inner Membrane (Cristae)"},
    {"concept": "Endosymbiosis Origin"}
  ]
}

Note:
${inputNote}`;

      const response = await chatWithAssistant(prompt);
      
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsedJson = JSON.parse(jsonMatch[0]);
        setMindMap(parsedJson);
        toast.success('Mind map generated successfully!');
      } else {
        throw new Error('Could not parse mind map data from response');
      }
    } catch (err) {
      console.error('Error generating mind map:', err);
      setError(`Failed to generate mind map: ${err instanceof Error ? err.message : 'Unknown error'}. Please try again.`);
      toast.error('Failed to generate mind map');
    } finally {
      setLoading(false);
    }
  };

  // Function to summarize the generated mind map
  const summarizeMindMap = async () => {
    if (!mindMap) {
      setError("Generate a mind map first before summarizing.");
      return;
    }

    setSummaryLoading(true);
    setError(null);
    setSummary(null);

    try {
      const mindMapText = `Main Topic: ${mindMap.mainTopic}\n\nIdeas:\n${mindMap.ideas.map((idea: any) => `- ${idea.concept}`).join('\n')}`;
      const prompt = `Provide a concise, engaging summary of the following mind map. Focus on the main topic and key ideas, highlighting the most important aspects.
Mind Map Content:\n${mindMapText}`;

      const response = await chatWithAssistant(prompt);
      setSummary(response);
      toast.success('Summary generated successfully!');
    } catch (err) {
      console.error('Error generating summary:', err);
      setError(`Failed to generate summary: ${err instanceof Error ? err.message : 'Unknown error'}. Please try again.`);
      toast.error('Failed to generate summary');
    } finally {
      setSummaryLoading(false);
    }
  };

  // Effect to draw SVG lines after mind map data is available and nodes are rendered
  useEffect(() => {
    const handleDraw = () => {
      if (mindMap && centralNodeRef.current && mindMapContainerRef.current) {
        const allPrimaryNodesRendered = mindMap.ideas.every((_: any, index: number) => primaryNodeRefs.current[index]);
        if (allPrimaryNodesRendered) {
          drawLines();
        }
      }
    };

    if (mindMap) {
      const timer = setTimeout(() => {
        requestAnimationFrame(handleDraw);
      }, 100);

      window.addEventListener('resize', handleDraw);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('resize', handleDraw);
      };
    }
  }, [mindMap]);

  const drawLines = () => {
    const svg = document.getElementById('mind-map-svg');
    if (!svg || !centralNodeRef.current || !mindMapContainerRef.current) return;

    // Clear existing paths/lines
    Array.from(svg.children).forEach(child => {
      if (child.tagName === 'line' || child.tagName === 'path') {
        svg.removeChild(child);
      }
    });

    const containerRect = mindMapContainerRef.current.getBoundingClientRect();
    const centralRect = centralNodeRef.current.getBoundingClientRect();
    const centralX = centralRect.left + centralRect.width / 2 - containerRect.left;
    const centralY = centralRect.top + centralRect.height / 2 - containerRect.top;

    mindMap.ideas.forEach((idea: any, index: number) => {
      const primaryNodeEl = primaryNodeRefs.current[index];
      if (primaryNodeEl) {
        const primaryRect = primaryNodeEl.getBoundingClientRect();
        const primaryX = primaryRect.left + primaryRect.width / 2 - containerRect.left;
        const primaryY = primaryRect.top + primaryRect.height / 2 - containerRect.top;

        // Function to find intersection point on a rounded rectangle border
        const findIntersection = (rect: DOMRect, targetX: number, targetY: number, centerX: number, centerY: number) => {
          const localTargetX = targetX - centerX;
          const localTargetY = targetY - centerY;
          const angle = Math.atan2(localTargetY, localTargetX);

          const halfWidth = rect.width / 2;
          const halfHeight = rect.height / 2;

          const cos = Math.cos(angle);
          const sin = Math.sin(angle);

          if (Math.abs(cos) < 1e-6) {
            return { x: centerX, y: centerY + (sin > 0 ? halfHeight : -halfHeight) };
          }
          if (Math.abs(sin) < 1e-6) {
            return { x: centerX + (cos > 0 ? halfWidth : -halfWidth), y: centerY };
          }

          let x_intersect = cos > 0 ? halfWidth : -halfWidth;
          let y_intersect = x_intersect * Math.tan(angle);

          if (Math.abs(y_intersect) <= halfHeight) {
            return { x: centerX + x_intersect, y: centerY + y_intersect };
          }

          y_intersect = sin > 0 ? halfHeight : -halfHeight;
          x_intersect = y_intersect / Math.tan(angle);

          if (Math.abs(x_intersect) <= halfWidth) {
            return { x: centerX + x_intersect, y: centerY + y_intersect };
          }
          
          return { x: centerX, y: centerY };
        };
        
        const startPoint = findIntersection(centralRect, primaryX, primaryY, centralX, centralY);
        const endPoint = findIntersection(primaryRect, centralX, centralY, primaryX, primaryY);

        // Create curved path instead of straight line for better visual appeal
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const midX = (startPoint.x + endPoint.x) / 2;
        const midY = (startPoint.y + endPoint.y) / 2;
        
        // Create a slight curve by offsetting the control point
        const controlX = midX + (endPoint.y - startPoint.y) * 0.1;
        const controlY = midY - (endPoint.x - startPoint.x) * 0.1;
        
        const pathData = `M ${startPoint.x} ${startPoint.y} Q ${controlX} ${controlY} ${endPoint.x} ${endPoint.y}`;
        path.setAttribute('d', pathData);
        path.setAttribute('stroke', '#38bdf8'); // sky-400
        path.setAttribute('stroke-width', '2');
        path.setAttribute('fill', 'none');
        svg.appendChild(path);
      }
    });
  };

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Mind Map Generator</h1>
          <p className="text-gray-600 mt-1">
            Transform your notes and ideas into visual mind maps using AI
          </p>
        </div>
        <div className="p-3 bg-sky-100 rounded-lg">
          <Brain className="h-6 w-6 text-sky-600" />
        </div>
      </div>

      {/* Input Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-shadow duration-300">
        <div className="space-y-4">
          <div>
            <label className="block text-lg font-semibold text-gray-800 mb-2">
              Enter your content here:
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={8}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent resize-none text-gray-700 transition-all duration-200"
              placeholder="E.g., Summarize the key aspects of Mitochondria, including its function as the powerhouse of the cell, ATP production, cellular respiration, independent reproduction, own DNA, double membrane structure, inner membrane (cristae), and endosymbiosis origin..."
            />
          </div>
          
          <button
            onClick={() => generateMindMap()}
            disabled={loading || !note.trim()}
            className="w-full bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-700 hover:to-cyan-700 text-white font-bold py-3 px-6 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
                Generating Mind Map...
              </div>
            ) : (
              <div className="flex items-center justify-center">
                <Sparkles className="h-5 w-5 mr-2" />
                Generate AI Mind Map
              </div>
            )}
          </button>

          {mindMap && (
            <button
              onClick={summarizeMindMap}
              disabled={summaryLoading}
              className="w-full bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white font-bold py-3 px-6 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {summaryLoading ? (
                <div className="flex items-center justify-center">
                  <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
                  Summarizing...
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <Sparkles className="h-5 w-5 mr-2" />
                  ✨ Summarize Mind Map
                </div>
              )}
            </button>
          )}
        </div>

        {error && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg" role="alert">
            <p className="font-bold">Error:</p>
            <p>{error}</p>
          </div>
        )}
      </div>

      {/* Generated Mind Map Visualization */}
      {mindMap && (
        <div
          ref={mindMapContainerRef}
          className="relative w-full max-w-5xl min-h-[650px] bg-gradient-to-br from-slate-100 to-blue-100 rounded-lg shadow-xl p-8 overflow-hidden mx-auto hover:shadow-2xl transition-shadow duration-300 flex items-center justify-center"
        >
          {/* SVG for drawing lines */}
          <svg id="mind-map-svg" className="absolute top-0 left-0 w-full h-full pointer-events-none z-0"></svg>

          {/* Centered Main Topic Node */}
          <div ref={centralNodeRef} className="absolute z-10">
            <div className="bg-sky-600 min-w-[200px] h-20 flex items-center justify-center text-center text-xl font-bold p-4 rounded-2xl shadow-lg text-white break-words transform hover:scale-105 transition-transform duration-200">
              {mindMap.mainTopic}
            </div>
          </div>

          {/* Primary Nodes - positioned radially */}
          {mindMap.ideas.slice(0, 8).map((idea: any, index: number) => {
            const totalNodes = Math.min(mindMap.ideas.length, 8);
            const angle = (index * 2 * Math.PI) / totalNodes - Math.PI / 2; // Start from top
            const radius = 250; // Distance from center
            
            const x = radius * Math.cos(angle);
            const y = radius * Math.sin(angle);

            return (
              <div
                key={index}
                className="absolute z-10"
                style={{
                  left: '50%',
                  top: '50%',
                  transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`
                }}
                ref={(el) => primaryNodeRefs.current[index] = el}
              >
                <div className="bg-white min-w-[180px] min-h-[70px] flex items-center justify-center p-3 px-4 rounded-xl shadow-lg text-sky-800 font-semibold border-2 border-sky-300 text-center break-words transform hover:scale-105 transition-transform duration-200">
                  {nodeIcons[idea.concept as keyof typeof nodeIcons] && (
                    <span className="text-2xl mr-2 flex-shrink-0">
                      {nodeIcons[idea.concept as keyof typeof nodeIcons]}
                    </span>
                  )}
                  <span className="flex-1 text-sm">{idea.concept}</span>
                </div>
              </div>
            );
          })}

          {/* Footer / Branding */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-gray-500 text-sm">
            MindVault AI
          </div>
        </div>
      )}

      {/* Summary Section */}
      {summary && (
        <div className="bg-sky-50 rounded-lg shadow-sm border border-sky-200 p-6 hover:shadow-lg transition-shadow duration-300">
          <h2 className="text-2xl font-bold text-sky-800 mb-4 border-b-2 border-sky-300 pb-2 flex items-center">
            <Brain className="h-6 w-6 mr-2" />
            Summary
          </h2>
          <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">{summary}</p>
        </div>
      )}

      {/* Empty State */}
      {!mindMap && !loading && (
        <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 flex items-center justify-center hover:shadow-lg transition-shadow duration-300">
          <div className="text-center py-12">
            <div className="mx-auto w-16 h-16 bg-sky-100 rounded-full flex items-center justify-center mb-4 transform hover:scale-110 transition-transform duration-200">
              <Network className="h-8 w-8 text-sky-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Ready to Create Your Mind Map?</h3>
            <p className="text-gray-500 mb-4 max-w-md">
              Enter your notes, ideas, or any content above and let AI transform it into a beautiful, 
              structured mind map that helps you visualize connections and concepts.
            </p>
            <div className="flex items-center justify-center space-x-6 text-sm text-gray-400">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-sky-600 rounded-full mr-2"></div>
                <span>Main Topic</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-white border-2 border-sky-300 rounded-full mr-2"></div>
                <span>Key Concepts</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-sky-400 rounded-full mr-2"></div>
                <span>Connections</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};