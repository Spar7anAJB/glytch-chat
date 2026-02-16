type LandingPageProps = {
  isAuthenticated: boolean;
  onGoToAuth: () => void;
  onOpenApp: () => void;
};

function LandingPage({ isAuthenticated, onGoToAuth, onOpenApp }: LandingPageProps) {
  return (
    <main className="landingPage">
      <section className="landingHero">
        <div className="landingBrand">
          <img className="landingBrandLogo" src="/logo.png" alt="Glytch Chat logo" />
          <p className="landingKicker">Glytch Chat Platform</p>
        </div>
        <h1>Dedicated frontend and backend, now separated.</h1>
        <p className="landingBody">
          The client UI runs as its own frontend while a backend service handles API traffic. You can log in,
          launch the app workspace, and keep transport concerns off the UI layer.
        </p>
        <div className="landingActions">
          <button type="button" className="landingPrimary" onClick={isAuthenticated ? onOpenApp : onGoToAuth}>
            {isAuthenticated ? "Open workspace" : "Get started"}
          </button>
          {!isAuthenticated && (
            <button type="button" className="landingSecondary" onClick={onGoToAuth}>
              Login / Sign up
            </button>
          )}
        </div>
      </section>

      <section className="landingGrid" aria-label="Architecture overview">
        <article>
          <h2>Frontend</h2>
          <p>Route-based UI with dedicated screens for landing, auth, and app workspace.</p>
        </article>
        <article>
          <h2>Backend</h2>
          <p>Node service that proxies Supabase APIs through a single backend entrypoint.</p>
        </article>
        <article>
          <h2>Desktop Ready</h2>
          <p>Electron dev and start scripts now boot backend automatically before opening the app.</p>
        </article>
      </section>
    </main>
  );
}

export default LandingPage;
