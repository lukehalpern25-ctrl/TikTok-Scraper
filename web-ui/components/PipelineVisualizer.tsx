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
      name: "Extract creator profiles from Apify",
      file: "01_extracted_profiles",
      description: "Extract author profiles from TikTok hashtag/discover feed",
    },
    {
      name: "Filter out existing creators",
      file: "02_new_creators_only",
      description: "Remove creators already present in our existing creator list",
    },
    {
      name: "Remove duplicate profiles by ID",
      file: "03_deduped_profiles",
      description: "Remove duplicate profiles using content hash",
    },
    {
      name: "Filter by minimum followers",
      file: "04_min_followers_filtered",
      description: "Filter by minimum follower count",
    },
    {
      name: "Filter by maximum followers",
      file: "05_max_followers_filtered",
      description: "Filter by maximum follower count",
    },
    {
      name: "Expand profiles with full data",
      file: "06_expanded_profiles",
      description: "Fetch additional profile data and recent videos",
    },
    {
      name: "Remove non-English creators",
      file: "07_english_creators_only",
      description: "Filter out non-English speaking creators",
    },
    {
      name: "Filter by video metrics",
      file: "08_video_metrics_filtered",
      description: "Apply video count and view metrics quality filters",
    },
    {
      name: "Filter creators with contact info",
      file: "09_final_with_contact",
      description: "Keep only creators with bio links or contact information",
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
        // Calculate unique creators count
        let count = 0;
        if (Array.isArray(data)) {
          const seenCreatorIds = new Set();
          count = data.filter((item) => {
            console.log(item);
            const creatorId = item.authorMeta?.id ?? item.id;
            if (!creatorId || seenCreatorIds.has(creatorId)) {
              return false;
            }
            seenCreatorIds.add(creatorId);
            return true;
          }).length;
        }
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
                ? ` (${step.count.toLocaleString()} unique creators)`
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
