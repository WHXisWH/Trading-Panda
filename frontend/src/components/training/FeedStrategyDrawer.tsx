"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Drawer } from "@/components/ui/Drawer";
import { FeedStrategyConfirmDialog } from "@/components/training/FeedStrategyConfirmDialog";
import { FeedStrategyEditorPanel } from "@/components/training/FeedStrategyEditorPanel";
import { FeedStrategyLibraryRail } from "@/components/training/FeedStrategyLibraryRail";
import { FeedStrategyPlaybookDialog } from "@/components/training/FeedStrategyPlaybookDialog";
import { FeedStrategyPromptBlock } from "@/components/training/FeedStrategyPromptBlock";
import { canonicalMarketPair } from "@/lib/market/canonicalMarketPair";
import { summarizePlaybookRules } from "@/lib/strategyPlaybookSummary";
import { agentWalletSetupPath } from "@/lib/ui/routeJump";
import { buildStrategyPromptTemplates } from "@/lib/strategyPromptTemplates";
import { toastSuccess } from "@/lib/ui/productToast";
import { useDebouncedCallback } from "@/hooks/useDebouncedCallback";
import { fetchAgentWalletStatus } from "@/services/agentWallet.service";
import {
  activateStrategy,
  listStrategies,
  parseStrategyText,
  saveStrategyDraft,
  strategyErrorMessage,
  updateStrategy,
  validateStrategy,
} from "@/services/strategy.service";
import { DEFAULT_POLICY_DRAFT } from "@/types/agent-wallet";
import type { ParsedStrategyLayers, StrategyListItem, StrategyValidateData } from "@/types/strategy";

interface FeedStrategyDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jwt: string | null;
  pandaId: string;
  activePool: string;
  authorizedPools: string[];
  onSaved?: () => void;
}

type SelectedId = string | "new-draft" | null;

interface EditorState {
  strategyId: string | null;
  title: string;
  humanSummary: string;
  sourceText: string;
  parsed: ParsedStrategyLayers;
  isActive: boolean;
}

function withTargetPairs(
  parsed: ParsedStrategyLayers,
  targetPairs: string[],
): ParsedStrategyLayers {
  return {
    ...parsed,
    target_pairs: parsed.target_pairs?.length ? parsed.target_pairs : targetPairs,
  };
}

function buildFeedConfirmSummary(item: StrategyListItem | undefined): string {
  if (!item) return "This playbook will guide when the Panda leans buy or sell.";
  const lines = summarizePlaybookRules(item.parsed, 2);
  if (lines.length === 0) return "This playbook will guide when the Panda leans buy or sell.";
  return lines.join(" · ");
}

export function FeedStrategyDrawer({
  open,
  onOpenChange,
  jwt,
  pandaId,
  activePool,
  authorizedPools,
  onSaved,
}: FeedStrategyDrawerProps) {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<SelectedId>(null);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [prompt, setPrompt] = useState("");
  const [builderKey, setBuilderKey] = useState("initial");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [invalidRuleIndexes, setInvalidRuleIndexes] = useState<number[]>([]);
  const [validateData, setValidateData] = useState<StrategyValidateData | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingFeedId, setPendingFeedId] = useState<string | null>(null);
  const [feedValidateData, setFeedValidateData] = useState<StrategyValidateData | null>(null);
  const [pendingFeedParsed, setPendingFeedParsed] = useState<ParsedStrategyLayers | null>(null);
  const [libraryExpanded, setLibraryExpanded] = useState(false);
  const [playbookDialogOpen, setPlaybookDialogOpen] = useState(false);
  const [playbookItem, setPlaybookItem] = useState<StrategyListItem | null>(null);

  const activePair = useMemo(() => canonicalMarketPair(activePool), [activePool]);

  const promptTemplates = useMemo(
    () => buildStrategyPromptTemplates(activePair),
    [activePair],
  );

  const targetPairs = useMemo(
    () => (activePair ? [activePair] : []),
    [activePair],
  );

  const { data: strategies = [], isLoading: listLoading, refetch: refetchList } = useQuery({
    queryKey: ["strategies", pandaId, jwt],
    enabled: Boolean(jwt && open),
    queryFn: () => listStrategies(jwt!, pandaId),
  });

  const { data: walletStatus } = useQuery({
    queryKey: ["agent-wallet-status", pandaId, jwt],
    enabled: Boolean(jwt && open),
    queryFn: () => fetchAgentWalletStatus(jwt!, pandaId),
  });

  const trainingBudget =
    walletStatus?.vault?.training_budget ??
    walletStatus?.account?.equity ??
    DEFAULT_POLICY_DRAFT.trainingBudget;
  const maxNotionalPerTrade = walletStatus?.policy?.max_notional_per_trade ?? null;

  const activeStrategy = useMemo(
    () => strategies.find((item) => item.is_active) ?? null,
    [strategies],
  );

  const runFeedValidateNow = useCallback(
    (parsed: ParsedStrategyLayers) => {
      if (!jwt) return;
      void validateStrategy(jwt, pandaId, {
        parsed: withTargetPairs(parsed, targetPairs),
      })
        .then((data) => setFeedValidateData(data))
        .catch(() => setFeedValidateData(null));
    },
    [jwt, pandaId, targetPairs],
  );

  const runFeedValidate = useDebouncedCallback(runFeedValidateNow, 400);

  const runEditorValidateNow = useCallback(
    (parsed: ParsedStrategyLayers) => {
      if (!jwt) return;
      void validateStrategy(jwt, pandaId, {
        parsed: withTargetPairs(parsed, targetPairs),
      })
        .then((data) => {
          setValidateData(data);
          setWarnings(data.warnings);
          setInvalidRuleIndexes(data.invalid_rules.map((r) => r.index));
        })
        .catch(() => setValidateData(null));
    },
    [jwt, pandaId, targetPairs],
  );

  const runEditorValidate = useDebouncedCallback(runEditorValidateNow, 400);

  const loadEditor = useCallback(
    (next: EditorState) => {
      if (!jwt) return;
      setEditor(next);
      setBuilderKey(`${next.strategyId ?? "draft"}-${Date.now()}`);
      setWarnings([]);
      setInvalidRuleIndexes([]);
      setValidateData(null);
      void validateStrategy(jwt!, pandaId, {
        parsed: withTargetPairs(next.parsed, targetPairs),
      })
        .then((data) => {
          setValidateData(data);
          setWarnings(data.warnings);
          setInvalidRuleIndexes(data.invalid_rules.map((r) => r.index));
        })
        .catch(() => {
          setValidateData(null);
        });
    },
    [jwt, pandaId, targetPairs],
  );

  useEffect(() => {
    if (!open) return;
    setLibraryExpanded(false);
  }, [open]);

  const parseMutation = useMutation({
    mutationFn: (rawText: string) => parseStrategyText(jwt!, pandaId, rawText),
    onSuccess: (data) => {
      setParseError(null);
      const nextEditor: EditorState = {
        strategyId: null,
        title: data.title,
        humanSummary: data.human_summary,
        sourceText: data.raw_text ?? prompt,
        parsed: withTargetPairs(data.parsed, targetPairs),
        isActive: false,
      };
      setSelectedId("new-draft");
      loadEditor(nextEditor);
      if (data.draft_valid === false) {
        toast.warning("Some rules need tuning — review the signal rules below");
      } else if (data.warnings?.length) {
        toast.warning(data.warnings[0] ?? "Review the drafted rules before saving");
      } else {
        toastSuccess("Strategy drafted — review the signal rules, then save");
      }
    },
    onError: (err) => {
      setParseError(strategyErrorMessage(err));
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!editor) throw new Error("No editor state");
      const parsed = withTargetPairs(editor.parsed, targetPairs);
      const title = editor.title.trim() || "Untitled strategy";

      if (editor.strategyId) {
        return updateStrategy(jwt!, pandaId, editor.strategyId, {
          raw_text: title,
          parsed,
        });
      }

      const saved = await saveStrategyDraft(jwt!, pandaId, {
        parsed,
        raw_text: title,
      });
      return {
        strategy_id: saved.strategy_id,
        version: saved.version,
        raw_text: saved.raw_text,
        parsed: saved.parsed,
        strategy_hash: saved.strategy_hash,
        proficiency: saved.proficiency,
        is_active: false,
        personality_match: saved.personality_match,
        created_at: new Date().toISOString(),
      } satisfies StrategyListItem;
    },
    onSuccess: (saved) => {
      const wasActive = editor?.isActive ?? false;
      const isFirstSave = !editor?.strategyId;
      toast.success(wasActive ? "Live playbook updated" : "Strategy saved");
      setEditor((prev) =>
        prev
          ? {
              ...prev,
              strategyId: saved.strategy_id,
              title: saved.raw_text,
              parsed: saved.parsed,
              isActive: saved.is_active,
            }
          : prev,
      );
      setSelectedId(saved.strategy_id);
      if (isFirstSave) {
        setLibraryExpanded(true);
      }
      void refetchList();
      void qc.invalidateQueries({ queryKey: ["strategy", pandaId] });
      void qc.invalidateQueries({ queryKey: ["panda-detail", pandaId] });
      if (!wasActive) {
        setPendingFeedId(saved.strategy_id);
        setPendingFeedParsed(withTargetPairs(saved.parsed, targetPairs));
        setFeedValidateData(validateData);
        setConfirmOpen(true);
      } else {
        onSaved?.();
      }
    },
    onError: (err) => toast.error(strategyErrorMessage(err)),
  });

  const feedMutation = useMutation({
    mutationFn: async (strategyId: string) => {
      const item = strategies.find((strategy) => strategy.strategy_id === strategyId);
      if (pendingFeedParsed && item) {
        await updateStrategy(jwt!, pandaId, strategyId, {
          raw_text: item.raw_text,
          parsed: withTargetPairs(pendingFeedParsed, targetPairs),
        });
      }
      return activateStrategy(jwt!, pandaId, strategyId);
    },
    onSuccess: () => {
      toast.success("Strategy fed to Panda");
      setConfirmOpen(false);
      setPendingFeedId(null);
      setPendingFeedParsed(null);
      setFeedValidateData(null);
      void refetchList();
      void qc.invalidateQueries({ queryKey: ["strategy", pandaId] });
      void qc.invalidateQueries({ queryKey: ["panda-detail", pandaId] });
      void qc.invalidateQueries({ queryKey: ["panda", pandaId] });
      onSaved?.();
    },
    onError: (err) => toast.error(strategyErrorMessage(err)),
  });

  const handleOpenPlaybook = (item: StrategyListItem) => {
    setPlaybookItem(item);
    setPlaybookDialogOpen(true);
  };

  const handleNewDraft = () => {
    setPlaybookDialogOpen(false);
    setPlaybookItem(null);
    setSelectedId("new-draft");
    setEditor(null);
    setPrompt("");
    setParseError(null);
    setValidateData(null);
    setWarnings([]);
    setInvalidRuleIndexes([]);
  };

  const handleFeedFromList = (item: StrategyListItem) => {
    if (!jwt) {
      toast.error("Sign in to feed a playbook to your Panda");
      return;
    }
    const nextParsed = withTargetPairs(item.parsed, targetPairs);
    setPendingFeedId(item.strategy_id);
    setPendingFeedParsed(nextParsed);
    setFeedValidateData(null);
    setConfirmOpen(true);
    runFeedValidateNow(nextParsed);
  };

  const handleRequestFeedFromDialog = (
    item: StrategyListItem,
    dialogValidate: StrategyValidateData | null,
    dialogParsed: ParsedStrategyLayers | null,
  ) => {
    setPlaybookDialogOpen(false);
    setPendingFeedId(item.strategy_id);
    setPendingFeedParsed(dialogParsed ?? withTargetPairs(item.parsed, targetPairs));
    setFeedValidateData(dialogValidate);
    setConfirmOpen(true);
  };

  const pendingFeedItem = strategies.find((s) => s.strategy_id === pendingFeedId);
  const confirmTitle = pendingFeedItem?.raw_text ?? editor?.title ?? "";
  const confirmSummary = buildFeedConfirmSummary(pendingFeedItem);

  const promptBlockProps = {
    prompt,
    onPromptChange: setPrompt,
    onParse: () => parseMutation.mutate(prompt.trim()),
    parsing: parseMutation.isPending,
    parseError,
    templates: promptTemplates,
    activePool: activePair,
    authorizedPools,
    agentWalletHref: agentWalletSetupPath(pandaId),
  };

  const editorPanel = editor ? (
    <FeedStrategyEditorPanel
      title={editor.title}
      onTitleChange={(value) => setEditor((prev) => (prev ? { ...prev, title: value } : prev))}
      humanSummary={editor.humanSummary}
      parsed={editor.parsed}
      builderKey={builderKey}
      warnings={warnings}
      invalidRuleIndexes={invalidRuleIndexes}
      saving={saveMutation.isPending}
      validateData={validateData}
      trainingBudget={trainingBudget}
      maxNotionalPerTrade={maxNotionalPerTrade}
      showGhostHint={Boolean(activeStrategy && !editor.isActive)}
      isActiveDraft={editor.isActive}
      onDraftChange={(parsed) => {
        setEditor((prev) => (prev ? { ...prev, parsed, humanSummary: "" } : prev));
        runEditorValidate(parsed);
      }}
      onSave={() => saveMutation.mutate()}
    />
  ) : null;

  return (
    <>
      <Drawer
        open={open}
        onOpenChange={onOpenChange}
        variant="product"
        className="md:w-[min(980px,96vw)]"
        eyebrow="Feed Strategy"
        title="Signal playbook"
        description="Save to your library first. Feeding makes a playbook live for training."
      >
        <div className="strategy-feed-split -mx-1 flex md:-mx-2">
          <FeedStrategyLibraryRail
            expanded={libraryExpanded}
            onExpandedChange={setLibraryExpanded}
            strategies={strategies}
            highlightedId={playbookDialogOpen ? playbookItem?.strategy_id ?? null : null}
            hasUnsavedDraft={selectedId === "new-draft" && editor !== null}
            listLoading={listLoading}
            onOpenPlaybook={handleOpenPlaybook}
            onNewDraft={handleNewDraft}
            onFeedFromList={handleFeedFromList}
          />

          <div className="strategy-feed-workspace flex flex-col gap-8">
            <FeedStrategyPromptBlock {...promptBlockProps} centered={!editor} />

            {editor && selectedId === "new-draft" ? (
              <div className="strategy-feed-review-zone">
                <p className="ledger-step-label mb-4">Review & edit</p>
                {editorPanel}
              </div>
            ) : null}
          </div>
        </div>
      </Drawer>

      {jwt ? (
        <FeedStrategyPlaybookDialog
          open={playbookDialogOpen}
          onOpenChange={setPlaybookDialogOpen}
          item={
            playbookItem
              ? strategies.find((s) => s.strategy_id === playbookItem.strategy_id) ?? playbookItem
              : null
          }
          jwt={jwt}
          pandaId={pandaId}
          targetPairs={targetPairs}
          trainingBudget={trainingBudget}
          maxNotionalPerTrade={maxNotionalPerTrade}
          hasActiveOther={Boolean(activeStrategy && !playbookItem?.is_active)}
          onSaved={() => {
            void refetchList();
            void qc.invalidateQueries({ queryKey: ["strategy", pandaId] });
            void qc.invalidateQueries({ queryKey: ["panda-detail", pandaId] });
          }}
          onRequestFeed={handleRequestFeedFromDialog}
        />
      ) : null}

      <FeedStrategyConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={confirmTitle}
        summary={confirmSummary}
        activeTitle={activeStrategy?.raw_text ?? null}
        parsed={pendingFeedParsed}
        trainingBudget={trainingBudget}
        maxNotionalPerTrade={maxNotionalPerTrade}
        policyConflicts={feedValidateData?.policy_conflicts}
        blockedPairs={feedValidateData?.blocked_pairs}
        loading={feedMutation.isPending}
        onLater={() => {
          setConfirmOpen(false);
          setPendingFeedId(null);
          setPendingFeedParsed(null);
          setFeedValidateData(null);
        }}
        onFeed={() => {
          if (!pendingFeedId) {
            toast.error("No playbook selected");
            return;
          }
          if (!jwt) {
            toast.error("Sign in to feed a playbook to your Panda");
            return;
          }
          feedMutation.mutate(pendingFeedId);
        }}
      />
    </>
  );
}
