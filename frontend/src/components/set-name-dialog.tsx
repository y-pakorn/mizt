import React, { useEffect, useMemo, useState } from "react"
import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
  useSuiClient,
} from "@mysten/dapp-kit"
import { Transaction } from "@mysten/sui/transactions"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import _ from "lodash"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { contract } from "@/config/contract"
import { useMiztKey } from "@/hooks/use-mizt-key"
import { refreshMiztName, useMiztName } from "@/hooks/use-mizt-name"
import { useMiztPubkey } from "@/hooks/use-mizt-pubkey"

import { Button } from "./ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog"
import { Input } from "./ui/input"

export function SetNameDialog({
  children,
  ...props
}: React.ComponentProps<typeof Dialog>) {
  const [open, setOpen] = useState(false)

  const [name, setName] = useState("")
  const [shownName, setShownName] = useState("")
  const setNameDebounced = useMemo(() => _.debounce(setName, 500), [])
  useEffect(() => {
    setNameDebounced(shownName)
  }, [shownName])

  const currentAccount = useCurrentAccount()

  const { data: isNameUsed } = useMiztPubkey({
    name,
    select: (data) => {
      if (!data) return null
      return data.owner === currentAccount?.address
    },
  })
  const { data: currentMiztName } = useMiztName({
    address: currentAccount?.address,
  })

  useEffect(() => {
    if (currentMiztName) {
      setShownName(currentMiztName)
    }
  }, [currentMiztName])

  const sae = useSignAndExecuteTransaction()
  const key = useMiztKey()
  const client = useSuiClient()
  const queryClient = useQueryClient()
  const setNameOnChain = useMutation({
    mutationFn: async () => {
      if (!key || !currentAccount) return
      const tx = new Transaction()
      console.log(key.pub, new Uint8Array(key.pub))
      tx.moveCall({
        target: `${contract.packageId}::core::register_name`,
        arguments: [
          tx.object(contract.miztId),
          tx.pure.string(name),
          tx.pure.vector("u8", key.pub),
        ],
      })
      const res = await sae.mutateAsync({
        transaction: tx,
      })
      await client.waitForTransaction({
        digest: res.digest,
      })
      toast.success(`Name "${name}" set on chain`)
      refreshMiztName(currentAccount.address, queryClient)
      setOpen(false)
    },
  })

  return (
    <Dialog open={open} onOpenChange={setOpen} {...props}>
      <DialogContent className="w-sm">
        <DialogHeader>
          <DialogTitle>Set Mizt Name</DialogTitle>
          <DialogDescription>
            Set a name for your Mizt account. This can be send to other users as
            a way to generate your private mizt account.
          </DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Input
            value={shownName}
            onChange={(e) => {
              setShownName(e.target.value)
            }}
            placeholder="Enter a name"
            className="pr-[60px]"
          />
          <div className="bg-background absolute top-1/2 right-4 -translate-y-1/2">
            .mizt
          </div>
        </div>
        {isNameUsed && (
          <div className="text-destructive text-xs">Name already used</div>
        )}
        <DialogFooter>
          <Button
            size="sm"
            disabled={!name || isNameUsed || setNameOnChain.isPending}
            onClick={() => setNameOnChain.mutateAsync()}
          >
            {setNameOnChain.isPending ? "Setting..." : "Set Name"}
            {setNameOnChain.isPending && <Loader2 className="animate-spin" />}
          </Button>
        </DialogFooter>
      </DialogContent>
      {children}
    </Dialog>
  )
}

export function SetNameDialogTrigger({
  children,
  ...props
}: React.ComponentProps<typeof DialogTrigger>) {
  return <DialogTrigger {...props}>{children}</DialogTrigger>
}
