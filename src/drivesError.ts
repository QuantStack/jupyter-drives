import { ReadonlyJSONObject } from '@lumino/coreutils';
import { ServerConnection } from '@jupyterlab/services';

/**
 * A wrapped error for a fetch response.
 */
export class DrivesResponseError extends ServerConnection.ResponseError {
  /**
   * Create a new response error.
   */
  constructor(
    response: Response,
    message = `Invalid response: ${response.status} ${response.statusText}`,
    traceback = '',
    json: ReadonlyJSONObject | null = {}
  ) {
    super(response, message);
    this.traceback = traceback; // traceback added in mother class in 2.2.x
    this._json = json ?? {};
  }

  /**
   * The error response JSON body
   */
  get json(): ReadonlyJSONObject {
    return this._json;
  }

  /**
   * The traceback associated with the error.
   */
  traceback: string;

  protected _json: ReadonlyJSONObject;
}
