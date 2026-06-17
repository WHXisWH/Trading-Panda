import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  fetchChainProofStatus,
  requestChainProof,
} from "@/services/chainProof.service";

export function useChainProof(
  jwt: string | null,
  pandaId: string | null,
  tradeFactId: string | null,
) {
  const queryClient = useQueryClient();
  const enabled = Boolean(jwt && pandaId && tradeFactId);

  const statusQuery = useQuery({
    queryKey: ["chain-proof", pandaId, tradeFactId],
    queryFn: () => fetchChainProofStatus(jwt!, pandaId!, tradeFactId!),
    enabled,
    refetchInterval: (query) => {
      const status = query.state.data?.chain_execution.status;
      if (status === "confirmed" || status === "failed") return false;
      return 4000;
    },
  });

  const requestMutation = useMutation({
    mutationFn: () => requestChainProof(jwt!, pandaId!, tradeFactId!),
    onMutate: () => {
      toast.message("Proof queued", {
        description: "Building testnet PTB under TradingPolicy collar.",
      });
    },
    onSuccess: (data) => {
      const digest = data.status.chain_execution.tx_digest;
      if (digest) {
        toast.success("Chain Proof confirmed", { description: digest });
      } else {
        toast.message("Proof submitted", { description: "Waiting for confirmation." });
      }
      queryClient.setQueryData(["chain-proof", pandaId, tradeFactId], data.status);
    },
    onError: (err: Error) => {
      toast.error("Proof failed safely", {
        description: err.message,
      });
    },
  });

  return {
    status: statusQuery.data,
    isLoading: statusQuery.isLoading,
    error: statusQuery.error,
    refetch: statusQuery.refetch,
    requestProof: requestMutation.mutate,
    isRequesting: requestMutation.isPending,
  };
}
