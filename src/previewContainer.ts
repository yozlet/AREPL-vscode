import {PythonResult} from "arepl-backend"
import * as vscode from "vscode"
import PythonPreview from "./pythonPreview"
import Reporter from "./telemetry"
import Utilities from "./utilities"

/**
 * logic wrapper around html preview doc
 */
export class PreviewContainer{
    public scheme: string
    printResults: string[] = [];
    pythonPreview: PythonPreview
    vars: {}

    constructor(private reporter: Reporter, context: vscode.ExtensionContext){
        this.pythonPreview = new PythonPreview(context);
        this.scheme = PythonPreview.scheme
    }

    public register(){
        return vscode.workspace.registerTextDocumentContentProvider(PythonPreview.scheme, this.pythonPreview);
    }

    public handleResult(pythonResults: PythonResult){

        console.log(pythonResults.execTime)
        console.log(pythonResults.totalPyTime)
        console.log(pythonResults.totalTime)

        // exec time is the 'truest' time that user cares about
        this.pythonPreview.updateTime(pythonResults.execTime);

        if(!pythonResults.done){
            const lineKey = "line " + pythonResults.lineno
            if(pythonResults.userVariables["dump output"] != undefined){
                const dumpOutput = pythonResults.userVariables["dump output"]
                pythonResults.userVariables = {}
                pythonResults.userVariables[lineKey] = dumpOutput
            }
            else{
                const v = pythonResults.userVariables
                pythonResults.userVariables = {}
                pythonResults.userVariables[pythonResults.caller + " vars " + lineKey] = v
            }
        }

        this.vars = {...this.vars, ...pythonResults.userVariables}
        
        // if no Vars & an error exists then it must be a syntax exception
        // in which case we skip updating because no need to clear out variables
        if(!Utilities.isEmpty(pythonResults.userVariables) || pythonResults.userError == ""){
            this.pythonPreview.updateVars(this.vars)
        }
        
        if(pythonResults.done){
            this.vars = {}
        }

        if(pythonResults.userError.startsWith("Sorry, AREPL has ran into an error")){
            this.reporter.sendError(pythonResults.userError)
        }

        if(this.printResults.length == 0) this.pythonPreview.clearPrint()

        this.updateError(pythonResults.userError, true)

        // clear print so empty for next program run
        if(pythonResults.done) this.printResults = [];
    }

    public handlePrint(pythonResults: string){
        this.printResults.push(pythonResults);
        this.pythonPreview.handlePrint(this.printResults.join('\n'))
    }

    /**
     * @param refresh if true updates page immediately.  otherwise error will show up whenever updateContent is called
     */
    public updateError(err: string, refresh=false){
        this.pythonPreview.updateError(err, refresh)
    }

    public handleSpawnError(pythonCommand: string, pythonPath: string, err: string){
        this.pythonPreview.handleSpawnError(pythonCommand, pythonPath, err)
    }

    get onDidChange(): vscode.Event<vscode.Uri> {
        return this.pythonPreview.onDidChange
    }

    provideTextDocumentContent(uri: vscode.Uri): string {
        return this.pythonPreview.provideTextDocumentContent(uri);
    };
}