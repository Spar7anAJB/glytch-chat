type RouteGuardPageProps = {
  onGoToAuth: () => void;
};

function RouteGuardPage({ onGoToAuth }: RouteGuardPageProps) {
  return (
    <main className="guardPage">
      <section className="guardCard">
        <img className="guardLogo" src="/logo.png" alt="Glytch Chat logo" />
        <h1>Sign in required</h1>
        <p>You need to authenticate before opening the chat workspace.</p>
        <button type="button" onClick={onGoToAuth}>
          Go to login
        </button>
      </section>
    </main>
  );
}

export default RouteGuardPage;
