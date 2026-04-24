import { useState, useCallback } from 'react';
import type { FragmentState } from '@/hooks/useFragmentState';
import type { PresetConfig } from './presetConfig';
import { Button } from '../ui/Button';
import { TextInput } from '../ui/TextInput';
import {
    serializeFragmentToPreset,
    isUserPresetValue,
    uniqueUserPresetValue,
} from '@/lib/fragmentPresetSerialize';
import { applyPresetToState } from './applyPresetToState';

interface PresetSaveDockProps {
    state: FragmentState;
    activePreset: string | null;
    communityPresets: PresetConfig[];
    onCommunityPresetsChange: (next: PresetConfig[]) => void | Promise<void>;
    onActivePresetChange: (value: string | null) => void;
    communitySync: 'loading' | 'cloud' | 'local';
    communitySavePending: boolean;
}

export function PresetSaveDock({
    state,
    activePreset,
    communityPresets,
    onCommunityPresetsChange,
    onActivePresetChange,
    communitySync,
    communitySavePending,
}: PresetSaveDockProps) {
    const [saveAsNewOpen, setSaveAsNewOpen] = useState(false);
    const [newPresetName, setNewPresetName] = useState('');

    const canUpdateUserPreset = activePreset !== null && isUserPresetValue(activePreset);

    const handleUpdateExisting = useCallback(() => {
        if (!canUpdateUserPreset || !activePreset) return;
        const existing = communityPresets.find((p) => p.value === activePreset);
        if (!existing) return;
        const ok = window.confirm(
            `Replace shared preset "${existing.label}" with the current settings? Everyone will see this version.`,
        );
        if (!ok) return;
        const nextConfig = serializeFragmentToPreset(state, {
            label: existing.label,
            value: existing.value,
        });
        void Promise.resolve(
            onCommunityPresetsChange(communityPresets.map((p) => (p.value === activePreset ? nextConfig : p))),
        ).catch(() => {
            /* error handled in parent */
        });
    }, [canUpdateUserPreset, activePreset, communityPresets, state, onCommunityPresetsChange]);

    const handleOpenSaveNew = useCallback(() => {
        setSaveAsNewOpen(true);
        setNewPresetName('');
    }, []);

    const handleCancelSaveNew = useCallback(() => {
        setSaveAsNewOpen(false);
        setNewPresetName('');
    }, []);

    const handleConfirmSaveNew = useCallback(() => {
        const name = newPresetName.trim();
        if (!name) return;
        const value = uniqueUserPresetValue(name, communityPresets);
        const preset = serializeFragmentToPreset(state, { label: name, value });
        const next = [...communityPresets, preset];
        void (async () => {
            try {
                await onCommunityPresetsChange(next);
                onActivePresetChange(preset.value);
                applyPresetToState(state, preset);
                state.setPresetOrCustomMode('presets');
                setSaveAsNewOpen(false);
                setNewPresetName('');
            } catch {
                /* parent reverts and alerts */
            }
        })();
    }, [newPresetName, communityPresets, state, onCommunityPresetsChange, onActivePresetChange]);

    const saveDisabled =
        communitySync === 'loading' || communitySavePending;

    return (
        <div className="border-t border-white/10 bg-black/55 backdrop-blur-md px-4 py-3 shrink-0 flex flex-col gap-3">
            {communitySync === 'local' && (
                <p className="text-[11px] text-amber-200/80">
                    Community sync is off. Presets stay in this browser only. For shared presets, set
                    Upstash env on Vercel:{' '}
                    <code className="text-amber-100/90">UPSTASH_REDIS_REST_URL</code> and{' '}
                    <code className="text-amber-100/90">UPSTASH_REDIS_REST_TOKEN</code> (or Vercel Redis{' '}
                    <code className="text-amber-100/90">KV_*</code>).
                </p>
            )}
            <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] text-white/45 uppercase tracking-widest mr-1">Save preset</span>
                <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={!canUpdateUserPreset || saveDisabled}
                    title={
                        canUpdateUserPreset
                            ? 'Overwrite this shared preset for everyone'
                            : 'Select a community preset you added (Save as new) to update it'
                    }
                    onClick={handleUpdateExisting}
                >
                    Update existing
                </Button>
                <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={saveDisabled}
                    onClick={handleOpenSaveNew}
                >
                    Save as new
                </Button>
            </div>
            {saveAsNewOpen && (
                <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
                    <div className="flex-1 min-w-0">
                        <TextInput
                            label="Name"
                            value={newPresetName}
                            onChange={setNewPresetName}
                            placeholder="e.g. My hero banner"
                            autoFocus
                        />
                    </div>
                    <div className="flex gap-2 shrink-0">
                        <Button type="button" variant="primary" size="sm" onClick={handleConfirmSaveNew}>
                            Save
                        </Button>
                        <Button type="button" variant="ghost" size="sm" onClick={handleCancelSaveNew}>
                            Cancel
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
