import { type RefObject } from "react";
import { Download, Copy, FileJson, Upload } from "lucide-react";
import type { FragmentActions } from "@/hooks/useFragmentActions";
import { Section } from '../ui/Section';
import { Button } from '../ui/Button';

interface ExportSvgPanelProps {
  actions: FragmentActions;
  allowCropping: boolean;
  validCellSizes: number[];
}

export function ExportSvgPanel({
  actions, allowCropping, validCellSizes,
}: ExportSvgPanelProps) {
  const isBlocked = !allowCropping && validCellSizes.length === 0;

  return (
    <Section title="SVG" borderless>
      <Button
        onClick={actions.exportToSVG}
        disabled={isBlocked}
        fullWidth
        icon={<Download className="w-4 h-4" />}
      >
        Export SVG
      </Button>

      <Button
        onClick={actions.copyToClipboard}
        disabled={isBlocked}
        fullWidth
        icon={<Copy className="w-4 h-4" />}
      >
        Copy SVG for Figma
      </Button>
    </Section>
  );
}

interface ConfigPanelProps {
  actions: FragmentActions;
  allowCropping: boolean;
  validCellSizes: number[];
  fileInputRef: RefObject<HTMLInputElement | null>;
}

export function ConfigPanel({
  actions, allowCropping, validCellSizes, fileInputRef,
}: ConfigPanelProps) {
  const isBlocked = !allowCropping && validCellSizes.length === 0;

  return (
    <Section title="Configuration" borderless>

        <Button
          onClick={actions.exportSettingsAsJson}
          disabled={isBlocked}
          className="flex-1"
          fullWidth
          icon={<FileJson className="w-4 h-4" />}
          data-action="export-json"
        >
          Export JSON
        </Button>

        <Button
          fullWidth
          onClick={() => fileInputRef.current?.click()}
          className="flex-1"
          icon={<Upload className="w-4 h-4" />}
        >
          Import JSON
        </Button>


      {/* Hidden file input for JSON import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        onChange={actions.importSettingsFromJson}
        className="hidden"
      />
    </Section>
  );
}
