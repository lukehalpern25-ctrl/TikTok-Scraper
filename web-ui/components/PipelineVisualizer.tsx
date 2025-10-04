import React, { useState, useEffect } from "react";
import { api } from "../utils/api";

interface PipelineStep {
  name: string;
  file: string;
  description: string;
  count?: number;
  retention?: number;
}

interface PipelineVisualizerProps {
  runTimestamp: string;
  selectedStep: string | null;
  onStepSelect: (stepFile: string) => void;
}

export function PipelineVisualizer({ runTimestamp, selectedStep, onStepSelect }: PipelineVisualizerProps) {
  const [steps, setSteps] = useState<PipelineStep[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedStepData, setSelectedStepData] = useState<any[]>([]);
  const [loadingStepData, setLoadingStepData] = useState(false);

  const stepDefinitions: PipelineStep[] = [
    {
      name: "Raw Extraction",
      file: "01_extracted_profiles",
      description: "Extract author profiles from TikTok discover feed"
    },
    {
      name: "Deduplication",
      file: "02_deduped_profiles",
      description: "Remove duplicate profiles using content hash"
    },
    {
      name: "Quality Filter Pass 1",
      file: "03_quality_filtered_pass1",
      description: "Filter by minimum followers and video count"
    },
    {
      name: "Profile Expansion",
      file: "04_expanded_video_rows",
      description: "Fetch additional profile data and recent videos"
    },
    {
      name: "Final Deduplication",
      file: "05_final_deduped_video_rows",
      description: "Remove duplicates after profile expansion"
    },
    {
      name: "Quality Filter Pass 2",
      file: "06_quality_filtered_pass3",
      description: "Filter by total video views and engagement"
    },
    {
      name: "Final Processing",
      file: "08_final_processed",
      description: "Keep only creators with contact information"
    }
  ];

  useEffect(() => {
    if (runTimestamp) {
      loadStepCounts();
    }
  }, [runTimestamp]);

  useEffect(() => {
    if (selectedStep && runTimestamp) {
      loadSelectedStepData();
    }
  }, [selectedStep, runTimestamp]);

  const loadStepCounts = async () => {
    setLoading(true);
    const updatedSteps = [...stepDefinitions];
    
    for (let i = 0; i < updatedSteps.length; i++) {
      try {
        const data = await api.getStepData(runTimestamp, updatedSteps[i].file);
        const count = Array.isArray(data) ? data.length : 0;
        updatedSteps[i].count = count;
        
        // Calculate retention rate compared to first step
        if (i === 0) {
          updatedSteps[i].retention = 100;
        } else if (updatedSteps[0].count && updatedSteps[0].count > 0) {
          updatedSteps[i].retention = (count / updatedSteps[0].count) * 100;
        }
      } catch (error) {
        updatedSteps[i].count = 0;
        updatedSteps[i].retention = 0;
      }
    }
    
    setSteps(updatedSteps);
    setLoading(false);
  };

  const loadSelectedStepData = async () => {
    if (!selectedStep) return;
    
    setLoadingStepData(true);
    try {
      const data = await api.getStepData(runTimestamp, selectedStep);
      setSelectedStepData(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load step data:', error);
      setSelectedStepData([]);
    }
    setLoadingStepData(false);
  };

  const getStepStatus = (step: PipelineStep, index: number) => {
    if (loading) return "loading";
    if (step.count === undefined) return "error";
    if (step.count === 0 && index > 0) return "warning";
    return "success";
  };

  const getRetentionColorClass = (retention?: number) => {
    if (!retention) return "text-gray-500";
    if (retention > 50) return "text-green-600";
    if (retention > 20) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="mb-4">
      <label htmlFor="pipeline-stage" className="block text-sm font-medium text-gray-700 mb-2">
        Pipeline Stage
      </label>
      <select
        id="pipeline-stage"
        value={selectedStep || ""}
        onChange={(e) => onStepSelect(e.target.value)}
        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
      >
        <option value="">Select a pipeline stage...</option>
        {steps.map((step, index) => {
          const status = getStepStatus(step, index);
          const count = step.count !== undefined ? ` (${step.count.toLocaleString()} items)` : '';
          const statusIcon = status === "success" ? "✓ " : status === "warning" ? "⚠ " : status === "error" ? "✗ " : "";
          
          return (
            <option key={step.file} value={step.file}>
              {statusIcon}Step {index + 1}: {step.name}{count}
            </option>
          );
        })}
      </select>
      
      {selectedStep && (
        <p className="mt-2 text-sm text-gray-600">
          {steps.find(s => s.file === selectedStep)?.description}
        </p>
      )}
    </div>
  );
}