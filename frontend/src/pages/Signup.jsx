import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { apiError } from '../api/client'
import { Alert, Button, Input } from '../components/ui'
import { AuthShell } from './Login'

export default function Signup() {
  const { signup } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    email: '',
    password: '',
    confirm: '',
    organizationName: '',
  })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirm) {
      setError('Passwords do not match.')
      return
    }
    setSubmitting(true)
    try {
      await signup(form.email, form.password, form.organizationName)
      navigate('/')
    } catch (err) {
      setError(apiError(err, 'Signup failed.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthShell title="Create your account" subtitle="Start managing your inventory">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Alert>{error}</Alert>
        <Input
          label="Organization name"
          value={form.organizationName}
          onChange={update('organizationName')}
          placeholder="My Test Store"
          required
        />
        <Input
          label="Email"
          type="email"
          value={form.email}
          onChange={update('email')}
          required
          autoComplete="email"
        />
        <Input
          label="Password"
          type="password"
          value={form.password}
          onChange={update('password')}
          required
          autoComplete="new-password"
        />
        <Input
          label="Confirm password"
          type="password"
          value={form.confirm}
          onChange={update('confirm')}
          required
          autoComplete="new-password"
        />
        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? 'Creating account...' : 'Sign up'}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-slate-500">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-indigo-600 hover:underline">
          Log in
        </Link>
      </p>
    </AuthShell>
  )
}
