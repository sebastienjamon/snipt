import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle } from "lucide-react"

export default function AuthCodeErrorPage() {
  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <CardTitle>Authentication Error</CardTitle>
          </div>
          <CardDescription>
            There was a problem signing you in
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            The authentication process encountered an error. This could happen for several reasons:
          </p>
          <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
            <li>The authentication link expired</li>
            <li>The authentication code was already used</li>
            <li>There was a network issue during authentication</li>
          </ul>
        </CardContent>
        <CardFooter>
          <Button asChild className="w-full">
            <Link href="/login">
              Try Again
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
