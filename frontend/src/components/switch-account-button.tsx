import { ComponentProps } from "react"
import {
  useAccounts,
  useCurrentAccount,
  useSwitchAccount,
} from "@mysten/dapp-kit"
import { Check, ChevronsLeftRightEllipsis } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function SwitchAccountButton({
  ...props
}: ComponentProps<typeof Button>) {
  const accounts = useAccounts()
  const currentAccount = useCurrentAccount()
  const switchAccount = useSwitchAccount()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="outlineTranslucent" {...props}>
          Switch Account <ChevronsLeftRightEllipsis />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {accounts.map((account) => {
          const isActive = account.address === currentAccount?.address
          return (
            <DropdownMenuItem
              key={account.address}
              className="w-[250px]"
              onClick={() => switchAccount.mutate({ account })}
            >
              <span className="font-semibold">{account.label}</span>
              <span className="text-muted-foreground">
                {account.address.slice(0, 8)}...
              </span>
              {isActive && <Check className="ml-auto size-4" />}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
