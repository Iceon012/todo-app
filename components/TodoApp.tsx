"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Trash2 } from "lucide-react"
import { supabase } from "@/lib/supabase-client"
import { toast, ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { User } from "@supabase/auth-helpers-nextjs"
import { RealtimePostgresChangesPayload } from "@supabase/supabase-js"

interface Todo {
    id: number
    user_id: string
    text: string
    completed: boolean
}

export default function TodoApp() {
    const [todos, setTodos] = useState<Todo[]>([])
    const [newTodo, setNewTodo] = useState("")
    const [user, setUser] = useState<User | null>(null)
    const router = useRouter()

    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                setUser(user)
                fetchTodos(user.id)
            } else {
                router.push("/signin")
            }
        }

        fetchUser()

        const channel = supabase
            .channel('any')
            .on('broadcast', { event: 'todos' }, (payload) => {
                console.log('Broadcast received:', payload)
                // Handle broadcast message here
            })
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'todos',
                },
                (payload: RealtimePostgresChangesPayload<Todo>) => handleRealtimeUpdate(payload)
            )
            .subscribe()

        return () => {
            channel.unsubscribe()
        }
    }, [router])

    const fetchTodos = async (userId: string) => {
        const { data, error } = await supabase
            .from('todos')
            .select('*')
            .eq('user_id', userId)
            .order('id', { ascending: true })

        if (error) {
            console.error('Error fetching todos:', error)
            toast.error('Failed to fetch todos')
        } else {
            setTodos(data || [])
        }
    }

    const handleRealtimeUpdate = (payload: RealtimePostgresChangesPayload<Todo>) => {
        console.log('Realtime update received:', payload)
        const { eventType, new: newRecord, old: oldRecord } = payload

        setTodos((currentTodos) => {
            switch (eventType) {
                case 'INSERT':
                    return [...currentTodos, newRecord!].sort((a, b) => a.id - b.id)
                case 'UPDATE':
                    return currentTodos.map((todo) => todo.id === newRecord!.id ? newRecord! : todo)
                case 'DELETE':
                    return currentTodos.filter((todo) => todo.id !== oldRecord!.id)
                default:
                    return currentTodos
            }
        })

        switch (eventType) {
            case 'INSERT':
                toast.success('New todo added')
                break
            case 'UPDATE':
                toast.info('Todo updated')
                break
            case 'DELETE':
                toast.info('Todo removed')
                break
        }
    }

    const addTodo = async (e: React.FormEvent) => {
        e.preventDefault()
        if (newTodo.trim() !== "" && user) {
            const { error } = await supabase
                .from('todos')
                .insert([{ text: newTodo, user_id: user.id, completed: false }])

            if (error) {
                console.error('Error adding todo:', error)
                toast.error('Failed to add todo')
            } else {
                setNewTodo("")
            }
        }
    }

    const toggleTodo = async (id: number) => {
        const todoToUpdate = todos.find(todo => todo.id === id)
        if (todoToUpdate) {
            const { error } = await supabase
                .from('todos')
                .update({ completed: !todoToUpdate.completed })
                .eq('id', id)

            if (error) {
                console.error('Error updating todo:', error)
                toast.error('Failed to update todo')
            }
        }
    }

    const removeTodo = async (id: number) => {
        const { error } = await supabase
            .from('todos')
            .delete()
            .eq('id', id)

        if (error) {
            console.error('Error removing todo:', error)
            toast.error('Failed to remove todo')
        }
    }

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        router.push("/signin")
    }

    if (!user) {
        return <div>Loading...</div>
    }

    return (
        <div className="flex justify-center items-center min-h-screen bg-gray-100">
            <Card className="w-[400px]">
                <CardHeader>
                    <CardTitle className="flex justify-between items-center">
                        <span>Todo App</span>
                        <Button onClick={handleSignOut} variant="outline" size="sm">Sign Out</Button>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={addTodo} className="flex space-x-2 mb-4">
                        <Input
                            type="text"
                            placeholder="Add a new todo"
                            value={newTodo}
                            onChange={(e) => setNewTodo(e.target.value)}
                        />
                        <Button type="submit">Add</Button>
                    </form>
                    <ul className="space-y-2">
                        {todos.map(todo => (
                            <li key={todo.id} className="flex items-center justify-between p-2 bg-white rounded shadow">
                                <div className="flex items-center">
                                    <Checkbox
                                        id={`todo-${todo.id}`}
                                        checked={todo.completed}
                                        onCheckedChange={() => toggleTodo(todo.id)}
                                        className="mr-2"
                                    />
                                    <label
                                        htmlFor={`todo-${todo.id}`}
                                        className={`${todo.completed ? 'line-through text-gray-500' : ''}`}
                                    >
                                        {todo.text}
                                    </label>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeTodo(todo.id)}
                                    aria-label="Remove todo"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </li>
                        ))}
                    </ul>
                </CardContent>
            </Card>
            <ToastContainer position="bottom-right" />
        </div>
    )
}
