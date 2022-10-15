/*
 * Copyright (c) 2022 Samsung Electronics Co., Ltd. All Rights Reserved
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as fs from 'fs';
import * as vscode from 'vscode';
import {Balloon} from '../Utils/Balloon';

import {disposeAll} from '../Utils/external/Dispose';
import {getNonce} from '../Utils/external/Nonce';
import {getUri} from '../Utils/external/Uri';

import {CircleEditorDocument} from './CircleEditorDocument';

/**
 * Message commands for communicating with webviews
 */
export enum MessageDefs {
  // message command
  alert = 'alert',
  request = 'request',
  response = 'response',
  pageloaded = 'pageloaded',
  loadmodel = 'loadmodel',
  finishload = 'finishload',
  reload = 'reload',
  selection = 'selection',
  backendColor = 'backendColor',
  error = 'error',
  colorTheme = 'colorTheme',
  // loadmodel type
  modelpath = 'modelpath',
  uint8array = 'uint8array',
  // selection
  names = 'names',
  tensors = 'tensors',
  // partiton of backends
  partition = 'partition',
  // commands for custom editor features
  edit = 'edit',
  loadJson = 'loadJson',
  updateJson = 'updateJson',
  getCustomOpAttrT = 'getCustomOpAttrT',
  requestEncodingData = 'requestEncodingData'
}

/**
 * Custom Editor Provider necessary for vscode extension API
 */
export class CircleEditorProvider implements vscode.CustomEditorProvider<CircleEditorDocument> {
  public static readonly viewType = 'one.editor.circle';
  private readonly folderMediaCircleEditor = 'media/CircleEditor';

  constructor(private readonly _context: vscode.ExtensionContext) {}

  private readonly _onDidChangeCustomDocument =
      new vscode.EventEmitter<vscode.CustomDocumentEditEvent<CircleEditorDocument>>();
  public readonly onDidChangeCustomDocument = this._onDidChangeCustomDocument.event;

  private readonly webviews = new WebviewCollection();

  public static register(context: vscode.ExtensionContext): void {
    const provider = new CircleEditorProvider(context);

    const registrations = [
      vscode.window.registerCustomEditorProvider(CircleEditorProvider.viewType, provider, {
        webviewOptions: {
          retainContextWhenHidden: true,
        },
        supportsMultipleEditorsPerDocument: true,
      }),
      // TODO: Add command registrations
    ];
    registrations.forEach((disposable) => context.subscriptions.push(disposable));
  }

  async openCustomDocument(
      uri: vscode.Uri, _openContext: {backupId?: string},
      _token: vscode.CancellationToken): Promise<CircleEditorDocument> {
    const document: CircleEditorDocument = await CircleEditorDocument.create(uri);

    const listeners: vscode.Disposable[] = [];

    listeners.push(document.onDidChangeDocument((e) => {
      // Tell VS Code that the document has been edited by the use.
      this._onDidChangeCustomDocument.fire({
        document,
        ...e,
      });
    }));

    listeners.push(document.onDidChangeContent((e) => {
      // Update all webviews when the document changes
      for (const webviewPanel of this.webviews.get(document.uri)) {
        this.postMessage(webviewPanel, e);
      }
    }));

    document.onDidDispose(() => disposeAll(listeners));
    return document;
  }

  resolveCustomEditor(
      document: CircleEditorDocument, webviewPanel: vscode.WebviewPanel,
      _token: vscode.CancellationToken): void|Thenable<void> {
    this.webviews.add(document.uri, webviewPanel);

    // Setup initial content for the webview
    webviewPanel.webview.options = {
      enableScripts: true,
    };
    webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview);

    webviewPanel.webview.onDidReceiveMessage((e) => this.onMessage(document, e));
  }

  saveCustomDocument(document: CircleEditorDocument, cancellation: vscode.CancellationToken):
      Thenable<void> {
    return document.save(cancellation);
  }
  saveCustomDocumentAs(
      document: CircleEditorDocument, destination: vscode.Uri,
      cancellation: vscode.CancellationToken): Thenable<void> {
    return document.saveAs(destination, cancellation);
  }
  revertCustomDocument(document: CircleEditorDocument, cancellation: vscode.CancellationToken):
      Thenable<void> {
    return document.revert(cancellation);
  }
  backupCustomDocument(
      document: CircleEditorDocument, context: vscode.CustomDocumentBackupContext,
      cancellation: vscode.CancellationToken): Thenable<vscode.CustomDocumentBackup> {
    return document.backup(context.destination, cancellation);
  }

  private postMessage(panel: vscode.WebviewPanel, body: any): void {
    panel.webview.postMessage(body);
  }

  private onMessage(document: CircleEditorDocument, message: any) {
    switch (message.command) {
      case MessageDefs.alert:
        Balloon.error(message.text, false);
        return;
      case MessageDefs.request:
        this.handleRequest(document, message.url, message.encoding);
        return;
      case MessageDefs.pageloaded:
        return;
      case MessageDefs.loadmodel:
        document.sendModel(parseInt(message.offset));
        return;
      case MessageDefs.finishload:
        return;
      case MessageDefs.selection:
        return;
      case MessageDefs.edit:
        document.makeEdit(message);
        return;
      case MessageDefs.loadJson:
        if(message.type === 'entireModel') {
          document.loadJson();
          return;
        }else if(message.type === 'partOfModel') {
          if(message.part === 'options') {
            document.loadJsonModelOptions();
            return;
          }else if(message.part === 'subgraphs') {
            document.loadJsonModelSubgraphs();
            return;
          }else if(message.part === 'buffers') {
            document.loadJsonModelBuffers(message);
            return;
          }else{
            return;
          }
        }
        return;
      case MessageDefs.updateJson:
        if(message.type === 'entireModel'){
          document.editJsonModel(message.data);
          return;
        }else if(message.type === 'partOfModel'){
          if(message.part === 'options') {
          
            return;
          }else if(message.part === 'subgraphs') {

            return;
          }else if(message.part === 'buffers') {

            return;
          }else{
            return;
          }
        }else{
          return;
        }
      case MessageDefs.getCustomOpAttrT:
        document.setCustomOpAttrT(message);
        return;
      case MessageDefs.requestEncodingData:
        document.sendEncodingData(message);
        return;
      default:
        // TODO: add MessageDefs and appropriate function to handle this request
        return;
    }
  }

  protected handleRequest(document: CircleEditorDocument, url: string, encoding: string) {
    // TODO check scheme
    const reqUrl = new URL(url);
    let filePath = vscode.Uri.joinPath(
        this._context.extensionUri, this.folderMediaCircleEditor, reqUrl.pathname);
    if (!fs.existsSync(filePath.fsPath)) {
      filePath = vscode.Uri.joinPath(
          this._context.extensionUri, `${this.folderMediaCircleEditor}/external`, reqUrl.pathname);
    }

    try {
      const fileData = fs.readFileSync(filePath.fsPath, {encoding: encoding, flag: 'r'});
      document._onDidChangeContent.fire({command: 'response', response: fileData});
    } catch (err) {
      document._onDidChangeContent.fire({command: 'error', response: ''});
    }
  }

  private getHtmlForWebview(webview: vscode.Webview): string {
    const htmlUrl = webview.asWebviewUri(
      vscode.Uri.joinPath(
        this._context.extensionUri,
        "media",
        "CircleEditorTest",
        "index.html"
      )
    );
    let html = fs.readFileSync(htmlUrl.fsPath, { encoding: "utf-8" });

    return html;
  }

  private getMediaPath(file: string) {
    return vscode.Uri.joinPath(this._context.extensionUri, this.folderMediaCircleEditor, file);
  }

  private updateExternalUri(
      html: string, webview: vscode.Webview, search: string, replace: string) {
    const replaceUri = this.getUriFromPath(webview, 'external/' + replace);
    return html.replace(search, `${replaceUri}`);
  }

  private updateUri(html: string, webview: vscode.Webview, search: string, replace: string) {
    const replaceUri = this.getUriFromPath(webview, replace);
    return html.replace(search, `${replaceUri}`);
  }

  private getUriFromPath(webview: vscode.Webview, file: string) {
    const mediaPath = this.getMediaPath(file);
    const uriView = webview.asWebviewUri(mediaPath);
    return uriView;
  }
}

/**
 * class for retaining webviews opened
 */
class WebviewCollection {
  private readonly _webviews =
      new Set<{readonly resource: string; readonly webviewPanel: vscode.WebviewPanel;}>();

  /**
   * Get all known webviews for a given uri.
   */
  public * get(uri: vscode.Uri): Iterable<vscode.WebviewPanel> {
    const key = uri.toString();

    for (const entry of this._webviews) {
      if (entry.resource === key) {
        yield entry.webviewPanel;
      }
    }
  }

  /**
   * Add a new webview to the collection.
   */
  public add(uri: vscode.Uri, webviewPanel: vscode.WebviewPanel) {
    const entry = {resource: uri.toString(), webviewPanel};
    this._webviews.add(entry);

    webviewPanel.onDidDispose(() => {
      this._webviews.delete(entry);
    });
  }
}
