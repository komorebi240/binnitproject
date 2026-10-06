"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { ApiRequestError } from "@/lib/api/client";
import type { UserProfile } from "@/features/auth/types";
import { useKpiConfig, useReplaceIncentiveTiers, useUpdateKpiConfig } from "../hooks/useKpi";
import type { IncentiveTierInput } from "../types";

interface KpiConfigFormProps {
  currentUser: UserProfile;
}

/** EXECUTIVE-only - the backend independently enforces this too (KpiController). */
export function KpiConfigForm({ currentUser }: KpiConfigFormProps) {
  const { data: config } = useKpiConfig();
  const updateConfig = useUpdateKpiConfig();
  const replaceTiers = useReplaceIncentiveTiers();
  const { showToast } = useToast();

  const [completionPercent, setCompletionPercent] = useState(70);
  const [tiers, setTiers] = useState<IncentiveTierInput[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (config) {
      setCompletionPercent(Math.round(config.completionWeight * 100));
      setTiers(config.tiers.map((t) => ({ minScore: t.minScore, label: t.label })));
    }
  }, [config]);

  if (currentUser.authorityLevel !== "EXECUTIVE") {
    return null;
  }

  async function handleSaveWeight(event: React.FormEvent) {
    event.preventDefault();
    setErrorMessage(null);
    try {
      await updateConfig.mutateAsync(completionPercent / 100);
      showToast("success", "Đã lưu công thức KPI");
    } catch (err) {
      setErrorMessage(err instanceof ApiRequestError ? err.message : "Không lưu được công thức");
    }
  }

  async function handleSaveTiers(event: React.FormEvent) {
    event.preventDefault();
    setErrorMessage(null);
    try {
      await replaceTiers.mutateAsync(tiers.filter((t) => t.label.trim().length > 0));
      showToast("success", "Đã lưu bảng insentive");
    } catch (err) {
      setErrorMessage(err instanceof ApiRequestError ? err.message : "Không lưu được bảng insentive");
    }
  }

  function updateTier(index: number, patch: Partial<IncentiveTierInput>) {
    setTiers((prev) => prev.map((t, i) => (i === index ? { ...t, ...patch } : t)));
  }

  function addTier() {
    setTiers((prev) => [...prev, { minScore: 0, label: "" }]);
  }

  function removeTier(index: number) {
    setTiers((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-fg">Công thức KPI &amp; Insentive</h2>

      <form onSubmit={handleSaveWeight} className="flex max-w-sm flex-col gap-3">
        <Input
          label="Trọng số tỷ lệ hoàn thành (%) - phần còn lại tính cho đúng hạn"
          type="number"
          min={0}
          max={100}
          value={completionPercent}
          onChange={(e) => setCompletionPercent(Number(e.target.value))}
        />
        <p className="text-xs text-fg-muted">
          KPI = {completionPercent}% × tỷ lệ hoàn thành + {100 - completionPercent}% × tỷ lệ đúng hạn
        </p>
        <Button type="submit" loading={updateConfig.isPending}>
          Lưu công thức
        </Button>
      </form>

      <form onSubmit={handleSaveTiers} className="flex flex-col gap-3">
        <p className="text-sm font-medium text-fg-soft">Bảng insentive theo mức KPI</p>
        {tiers.map((tier, index) => (
          <div key={index} className="flex items-center gap-2">
            <Input
              label="Điểm tối thiểu"
              type="number"
              min={0}
              max={100}
              className="w-32"
              value={tier.minScore}
              onChange={(e) => updateTier(index, { minScore: Number(e.target.value) })}
            />
            <Input
              label="Mô tả"
              value={tier.label}
              onChange={(e) => updateTier(index, { label: e.target.value })}
            />
            <Button type="button" variant="danger" onClick={() => removeTier(index)}>
              Xoá
            </Button>
          </div>
        ))}
        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={addTier}>
            Thêm mức
          </Button>
          <Button type="submit" loading={replaceTiers.isPending}>
            Lưu bảng insentive
          </Button>
        </div>
      </form>

      {errorMessage && (
        <p role="alert" className="text-sm text-danger">
          {errorMessage}
        </p>
      )}
    </section>
  );
}
