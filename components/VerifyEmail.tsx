"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { supabase } from "@/lib/supabase-client"

export default function VerifyEmail() {
    const [error, setError] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const router = useRouter()

    useEffect(() => {
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (session) {
                router.push("/todos")
            } else {
                setIsLoading(false)
            }
        }

        checkSession()
    }, [router])

    const handleResendEmail = async () => {
        setError(null)
        setIsLoading(true)

        const { data: { user } } = await supabase.auth.getUser()

        if (user && user.email) {
            const { error } = await supabase.auth.resend({
                type: 'signup',
                email: user.email,
            })

            if (error) {
                setError(error.message)
            } else {
                setError("Verification email resent. Please check your inbox.")
            }
        } else {
            setError("Unable to resend verification email. Please try signing up again.")
        }

        setIsLoading(false)
    }

    if (isLoading) {
        return <div>Loading...</div>
    }

    return (
        <div className="flex justify-center items-center min-h-screen bg-gray-100">
            <Card className="w-[400px]">
                <CardHeader>
                    <CardTitle>Verify Your Email</CardTitle>
                    <CardDescription>
                        We`ve sent a verification email to your inbox. Please check your email and click the verification link to complete your registration.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {error && (
                        <Alert variant={error.includes("resent") ? "default" : "destructive"} className="mb-4">
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}
                    <p className="text-sm text-gray-600 mb-4">
                        If you don`t see the email in your inbox, please check your spam folder.
                    </p>
                </CardContent>
                <CardFooter className="flex justify-between">
                    <Button onClick={handleResendEmail} disabled={isLoading}>
                        Resend Verification Email
                    </Button>
                    <Button variant="outline" onClick={() => router.push("/signin")}>
                        Back to Sign In
                    </Button>
                </CardFooter>
            </Card>
        </div>
    )
}