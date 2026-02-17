import { logoAssetUrl } from "../lib/assets";

type DownloadPageProps = {
  macInstallerUrl: string;
  windowsInstallerUrl: string;
  linuxInstallerUrl: string;
  onBackHome: () => void;
  onStartChatting: () => void;
};

type DownloadCardProps = {
  title: string;
  description: string;
  ctaLabel: string;
  installerUrl: string;
};

function DownloadCard({ title, description, ctaLabel, installerUrl }: DownloadCardProps) {
  const normalizedInstallerUrl = installerUrl.trim();
  const hasInstaller = normalizedInstallerUrl.length > 0;

  return (
    <article className="downloadCard">
      <h2>{title}</h2>
      <p>{description}</p>
      {hasInstaller ? (
        <a className="downloadButton" href={normalizedInstallerUrl} target="_blank" rel="noreferrer">
          {ctaLabel}
        </a>
      ) : (
        <p className="downloadUnavailable" role="status">
          Installer is not available yet.
        </p>
      )}
    </article>
  );
}

function DownloadPage({
  macInstallerUrl,
  windowsInstallerUrl,
  linuxInstallerUrl,
  onBackHome,
  onStartChatting,
}: DownloadPageProps) {
  return (
    <main className="downloadPage">
      <section className="downloadHero">
        <div className="downloadBrand">
          <img className="downloadBrandLogo" src={logoAssetUrl} alt="Glytch Chat logo" />
          <p className="downloadKicker">Glytch Chat Desktop</p>
        </div>
        <h1>Download Glytch Chat</h1>
        <p className="downloadBody">Choose your operating system to download the desktop installer.</p>
        <div className="downloadActions">
          <button type="button" className="landingSecondary" onClick={onBackHome}>
            Back
          </button>
          <button type="button" className="landingPrimary" onClick={onStartChatting}>
            Start chatting on web
          </button>
        </div>
      </section>

      <section className="downloadGrid" aria-label="Desktop installers">
        <DownloadCard
          title="macOS"
          description="Download the `.dmg` installer for Apple Silicon or Intel Macs."
          ctaLabel="Download for macOS"
          installerUrl={macInstallerUrl}
        />
        <DownloadCard
          title="Windows"
          description="Download the `.exe` installer for Windows 10 and 11."
          ctaLabel="Download for Windows"
          installerUrl={windowsInstallerUrl}
        />
        <DownloadCard
          title="Linux"
          description="Download the `.AppImage` package for desktop Linux."
          ctaLabel="Download for Linux"
          installerUrl={linuxInstallerUrl}
        />
      </section>
    </main>
  );
}

export default DownloadPage;
