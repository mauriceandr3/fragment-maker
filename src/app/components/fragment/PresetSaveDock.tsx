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
    userPresets: PresetConfig[];
    onUserPresetsChange: (next: PresetConfig[]) => void;
    onActivePresetChange: (value: string | null) => void;
}

export function PresetSaveDock({
    state,
    activePreset,
    userPresets,
    onUserPresetsChange,
    onActivePresetChange,
}: PresetSaveDockProps) {
    const [saveAsNewOpen, setSaveAsNewOpen] = useState(false);
    const [newPresetName, setNewPresetName] = useState('');

    const canUpdateUserPreset = activePreset !== null && isUserPresetValue(activePreset);

    const handleUpdateExisting = useCallback(() => {
        if (!canUpdateUserPreset || !activePreset) return;
        const existing = userPresets.find((p) => p.value === activePreset);
        if (!existing) return;
        const ok = window.confirm(
            `Replace saved preset "${existing.label}" with the current settings? This cannot be undone.`,
        );
        if (!ok) return;
        const nextConfig = serializeFragmentToPreset(state, {
            label: existing.label,
            value: existing.value,
        });
        onUserPresetsChange(userPresets.map((p) => (p.value === activePreset ? nextConfig : p)));
    }, [canUpdateUserPreset, activePreset, userPresets, state, onUserPresetsChange]);

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
        const value = uniqueUserPresetValue(name, userPresets);
        const preset = serializeFragmentToPreset(state, { label: name, value });
        const next = [...userPresets, preset];
        onUserPresetsChange(next);
        onActivePresetChange(preset.value);
        applyPresetToState(state, preset);
        state.setPresetOrCustomMode('presets');
        setSaveAsNewOpen(false);
        setNewPresetName('');
    }, [newPresetName, userPresets, state, onUserPresetsChange, onActivePresetChange]);

    return (
        <div className="border-t border-white/10 bg-black/55 backdrop-blur-md px-4 py-3 shrink-0 flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] text-white/45 uppercase tracking-widest mr-1">Save preset</span>
                <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={!canUpdateUserPreset}
                    title={
                        canUpdateUserPreset
                            ? 'Overwrite the selected user preset'
                            : 'Select one of your saved presets (from “Save as new”) to update it'
                    }
                    onClick={handleUpdateExisting}
                >
                    Update existing
                </Button>
                <Button type="button" variant="secondary" size="sm" onClick={handleOpenSaveNew}>
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
