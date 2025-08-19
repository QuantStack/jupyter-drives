import {
  JupyterFrontEndPlugin,
  JupyterFrontEnd
} from '@jupyterlab/application';
import { SessionContext } from '@jupyterlab/apputils';
import {
  IDocumentManager,
  IDocumentWidgetOpener
} from '@jupyterlab/docmanager';

/**
 * A plugin to patch the session context path so it includes the drive name.
 * associated with.
 */
export const sessionContextPatch: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlite/application-extension:session-context-patch',
  autoStart: true,
  requires: [IDocumentManager, IDocumentWidgetOpener],
  activate: (
    app: JupyterFrontEnd,
    docManager: IDocumentManager,
    widgetOpener: IDocumentWidgetOpener
  ) => {
    const contents = app.serviceManager.contents;

    widgetOpener.opened.connect((_, widget) => {
      const context = docManager.contextForWidget(widget);
      const driveName = contents.driveName(context?.path ?? '');
      if (driveName === '') {
        // do nothing if this is the default drive
        return;
      }
      const sessionContext = widget.context.sessionContext as SessionContext;

      // Path the session context to include the drive name
      sessionContext['_path'] = context?.path;
    });
  }
};
