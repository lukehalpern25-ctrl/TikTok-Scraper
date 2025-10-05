import React, { useState, useEffect } from "react";
import { api } from "../utils/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

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

export function PipelineVisualizer({
  runTimestamp,
  selectedStep,
  onStepSelect,
}: PipelineVisualizerProps) {
  const [steps, setSteps] = useState<PipelineStep[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedStepData, setSelectedStepData] = useState<any[]>([]);
  const [loadingStepData, setLoadingStepData] = useState(false);

  const stepDefinitions: PipelineStep[] = [
    {
      name: "Raw Extraction",
      file: "01_extracted_profiles",
      description: "Extract author profiles from TikTok hashtag/discover feed",
    },
    {
      name: "Deduplication",
      file: "02_deduped_profiles",
      description: "Remove duplicate profiles using content hash",
    },
    {
      name: "Quality Filter Pass 1",
      file: "03_quality_filtered_pass1",
      description: "Filter by minimum followers and video count",
    },
    {
      name: "Profile Expansion",
      file: "04_expanded_profiles",
      description: "Fetch additional profile data and recent videos",
    },
    {
      name: "Video Deduplication",
      file: "05_final_deduped_video_rows",
      description: "Remove duplicate video rows after profile expansion",
    },
    {
      name: "Quality Filter Pass 2",
      file: "06_quality_filtered_pass2",
      description: "Filter by video views and engagement metrics",
    },
    {
      name: "Quality Filter Pass 3",
      file: "07_quality_filtered_pass3",
      description: "Apply final quality filters and thresholds",
    },
    {
      name: "Final Processing",
      file: "08_final_processed",
      description:
        "Keep only creators with contact information and meeting all criteria",
    },
  ];

  useEffect(() => {
    if (runTimestamp) {
      loadStepCounts();
    }
  }, [runTimestamp]);

  // Auto-select the last stage when steps are loaded
  useEffect(() => {
    if (steps.length > 0 && !selectedStep) {
      onStepSelect(steps[steps.length - 1].file);
    }
  }, [steps, selectedStep, onStepSelect]);

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
      console.error("Failed to load step data:", error);
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
      <label className="block text-sm font-medium text-slate-700 mb-2">
        Pipeline Stage
      </label>
      <Select value={selectedStep || ""} onValueChange={onStepSelect}>
        <SelectTrigger>
          <SelectValue placeholder="Select a pipeline stage..." />
        </SelectTrigger>
        <SelectContent>
          {steps.map((step, index) => {
            const status = getStepStatus(step, index);
            const count =
              step.count !== undefined
                ? ` (${step.count.toLocaleString()} items)`
                : "";
            const statusIcon =
              status === "success"
                ? "✓ "
                : status === "warning"
                  ? "⚠ "
                  : status === "error"
                    ? "✗ "
                    : "";

            return (
              <SelectItem key={step.file} value={step.file}>
                {statusIcon}Step {index + 1}: {step.name}
                {count}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>

      {selectedStep && (
        <p className="mt-2 text-sm text-slate-600">
          {steps.find((s) => s.file === selectedStep)?.description}
        </p>
      )}
    </div>
  );
}
