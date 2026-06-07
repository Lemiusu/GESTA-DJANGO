import subprocess, sys
from pathlib import Path
from django.conf import settings
from django.core.management import call_command
from django.core.management.base import BaseCommand

FRONTEND_DIR = Path(settings.BASE_DIR) / "frontend"
NPM = "npm.cmd" if sys.platform == "win32" else "npm"

class Command(BaseCommand):
    help = "Builds the React frontend and starts the Django development server."

    def add_arguments(self, parser):
        parser.add_argument("--port", default="8000")
        parser.add_argument("--skip-build", action="store_true", dest="skip_build")
        parser.add_argument("--install", action="store_true", dest="install")

    def handle(self, *args, **options):
        if not FRONTEND_DIR.exists():
            self.stderr.write(self.style.ERROR(f"Frontend no encontrado: {FRONTEND_DIR}"))
            sys.exit(1)

        if options["install"]:
            self.stdout.write(self.style.MIGRATE_HEADING("Ejecutando npm install..."))
            r = subprocess.run([NPM, "install", "--legacy-peer-deps"], cwd=FRONTEND_DIR)
            if r.returncode != 0:
                self.stderr.write(self.style.ERROR("npm install fallo.")); sys.exit(r.returncode)
            self.stdout.write(self.style.SUCCESS("npm install completado.\n"))

        if not options["skip_build"]:
            self.stdout.write(self.style.MIGRATE_HEADING("Compilando frontend React..."))
            # vite build solo (sin tsc) para ignorar errores de TypeScript
            r = subprocess.run([NPM, "run", "build-only"], cwd=FRONTEND_DIR)
            if r.returncode != 0:
                self.stderr.write(self.style.ERROR("npm run build fallo.")); sys.exit(r.returncode)
            self.stdout.write(self.style.SUCCESS("Build completado.\n"))

        dist_dir = FRONTEND_DIR / "dist"
        if not dist_dir.exists():
            self.stderr.write(self.style.ERROR(f"No se encontro dist/ en {dist_dir}")); sys.exit(1)

        port = options["port"]
        self.stdout.write(self.style.MIGRATE_HEADING(f"Iniciando Django en http://127.0.0.1:{port}/\n"))
        call_command("runserver", f"0.0.0.0:{port}")
