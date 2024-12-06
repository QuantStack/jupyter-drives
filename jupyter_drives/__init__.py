try:
    from ._version import __version__
except ImportError:
    # Fallback when using the package in dev mode without installing
    # in editable mode with pip. It is highly recommended to install
    # the package from a stable release or in editable mode: https://pip.pypa.io/en/stable/topics/local-project-installs/#editable-installs
    import warnings
    warnings.warn("Importing 'jupyter_drives' outside a proper installation.")
    __version__ = "dev"

import traitlets


def _jupyter_labextension_paths():
    return [{
        "src": "labextension",
        "dest": "jupyter-drives"
    }]


def _jupyter_server_extension_points():
    return [{
        "module": "jupyter_drives"
    }]


def _load_jupyter_server_extension(server_app):
    """Registers the API handler to receive HTTP requests from the frontend extension.

    Parameters
    ----------
    server_app: jupyterlab.labapp.LabApp
        JupyterLab application instance
    """
    from .handlers import setup_handlers

    setup_handlers(server_app.web_app, server_app.config)
    name = "jupyter_drives"
    server_app.log.info(f"Registered {name} server extension")

# Entry points
def get_manager(config: "traitlets.config.Config") -> "jupyter_drives.managers.JupyterDrivesManager":
    """Drives Manager factory"""
    from .manager import JupyterDrivesManager

    return JupyterDrivesManager(config)
