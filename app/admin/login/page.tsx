export default function AdminLoginPage() {
  return (
    <main className="page-shell">
      <section className="card" style={{ maxWidth: 540, margin: '64px auto' }}>
        <div className="card-body-lg stack-md">
          <span className="badge">Admin</span>
          <h1 className="heading-lg">Login zum Admin-Dashboard</h1>
          <p className="muted">Gib das Admin-Passwort ein, das du in der Umgebungsvariable ADMIN_PASSWORD gesetzt hast.</p>

          <form action="/api/admin/login" method="post" className="stack-md">
            <label className="field">
              <span className="label">Passwort</span>
              <input className="input" type="password" name="password" required />
            </label>
            <button className="button" type="submit">Einloggen</button>
          </form>

          <p className="small muted">Nach dem Login landest du automatisch im Dashboard.</p>
        </div>
      </section>
    </main>
  );
}
