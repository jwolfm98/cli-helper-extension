const vscode = require('vscode');
const path = require('path');
const fs = require('fs');

function activate(context) {
  // Command to generate CLI command stub
  let generateDisposable = vscode.commands.registerCommand('cliHelper.generateCLICommand', () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('No active editor found.');
      return;
    }

    // Save the current cursor position and document URI
    const cursorPos = editor.selection.active;
    const targetUri = editor.document.uri;

    // Create and show a new Webview panel
    const panel = vscode.window.createWebviewPanel(
      'cliHelper',
      'CLI Command Generator',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [
          vscode.Uri.file(path.join(context.extensionPath, 'resources'))
        ]
      }
    );

    panel.webview.html = getWebviewContent();

    // Listen for messages from the Webview
    panel.webview.onDidReceiveMessage(
      message => {
        if (message.command === 'generate') {
          const commandData = message.data;
          const generatedCode = generateCLICommandCode(commandData);

          // Re-open the document from its URI and insert the generated code at the saved cursor position
          vscode.workspace.openTextDocument(targetUri).then(document => {
            vscode.window.showTextDocument(document).then(editor => {
              editor.edit(editBuilder => {
                editBuilder.insert(cursorPos, generatedCode);
              });
            });
          });

          vscode.window.showInformationMessage('CLI command generated!');
          panel.dispose();
        }
      },
      undefined,
      context.subscriptions
    );
  });

  // Command to copy the argument parsing resources separately
  let copyDisposable = vscode.commands.registerCommand('cliHelper.copyArgParsingResources', () => {
    if (!vscode.workspace.rootPath) {
      vscode.window.showErrorMessage('No workspace folder found.');
      return;
    }
    const targetFolder = path.join(vscode.workspace.rootPath, 'src', 'cli_utils');
    if (!fs.existsSync(targetFolder)) {
      fs.mkdirSync(targetFolder, { recursive: true });
    }
    fs.copyFileSync(
      path.join(context.extensionPath, 'resources', 'cli_args.h'),
      path.join(targetFolder, 'cli_args.h')
    );
    fs.copyFileSync(
      path.join(context.extensionPath, 'resources', 'cli_args.c'),
      path.join(targetFolder, 'cli_args.c')
    );
    vscode.window.showInformationMessage('Argument parsing resources copied!');
  });

  context.subscriptions.push(generateDisposable);
  context.subscriptions.push(copyDisposable);
}

function getWebviewContent() {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>CLI Command Generator</title>
    </head>
    <body>
      <h1>Generate CLI Command</h1>
      <form id="cliForm">
        <label>Group Name (@ingroup):</label><br>
        <input type="text" name="groupName" required><br><br>
        <label>Brief Description (@brief):</label><br>
        <textarea name="briefDesc" required></textarea><br><br>
        <label>Function Name:</label><br>
        <input type="text" name="funcName" required><br><br>

        <div id="arguments">
          <h3>Arguments</h3>
        </div>
        <button type="button" id="addArg">Add Argument</button><br><br>
        <button type="submit">Generate</button>
      </form>

      <script>
        const vscode = acquireVsCodeApi();

        document.getElementById('addArg').addEventListener('click', () => {
          const argDiv = document.createElement('div');
          argDiv.innerHTML = \`
            <hr>
            <label>Argument Name:</label><br>
            <input type="text" name="argName" required><br>
            <label>Description:</label><br>
            <input type="text" name="argDesc" required><br>
            <label>Parser Type:</label><br>
            <select name="argParser" class="argParser">
              <option value="uint32">Unsigned Integer (32-bit)</option>
              <option value="uint64">Unsigned Integer (64-bit)</option>
              <option value="int">Signed Integer</option>
              <option value="float">Floating Point</option>
              <option value="hex">Hexadecimal</option>
              <option value="bool">Boolean</option>
              <option value="string">String Option Set</option>
              <option value="ip">IPv4 Address</option>
              <option value="ip_mask">IPv4 Address + Netmask</option>
            </select><br>
            <div class="parserParams"></div>
            <button type="button" class="removeArg">Remove Argument</button><br>
          \`;

          const parserSelect = argDiv.querySelector('.argParser');
          const paramsDiv = argDiv.querySelector('.parserParams');

          function updateParams() {
            const type = parserSelect.value;
            paramsDiv.innerHTML = '';

            if (["uint32", "uint64", "int", "float", "hex"].includes(type)) {
              paramsDiv.innerHTML += \`
                <label>Min Value:</label><br>
                <input type="number" name="argMin"><br>
                <label>Max Value:</label><br>
                <input type="number" name="argMax"><br>
              \`;
            } else if (type === "string") {
              paramsDiv.innerHTML += \`
                <label>Comma-separated Options:</label><br>
                <input type="text" name="argOptions"><br>
              \`;
            }
          }

          parserSelect.addEventListener('change', updateParams);
          updateParams();

          document.getElementById('arguments').appendChild(argDiv);
          argDiv.querySelector('.removeArg').addEventListener('click', () => argDiv.remove());
        });

        document.getElementById('cliForm').addEventListener('submit', (e) => {
          e.preventDefault();
          const formData = new FormData(e.target);
          const argNames = formData.getAll('argName');
          const args = [];

          for (let i = 0; i < argNames.length; i++) {
            args.push({
              name: formData.getAll('argName')[i],
              description: formData.getAll('argDesc')[i],
              parser: formData.getAll('argParser')[i],
              min: formData.getAll('argMin')[i] || null,
              max: formData.getAll('argMax')[i] || null,
              options: formData.getAll('argOptions')[i] || null
            });
          }

          const data = {
            groupName: formData.get('groupName'),
            briefDesc: formData.get('briefDesc'),
            funcName: formData.get('funcName'),
            args: args
          };

          vscode.postMessage({
            command: 'generate',
            data: data
          });
        });
      </script>
    </body>
    </html>
  `;
}


function generateCLICommandCode(data) {
  const config = vscode.workspace.getConfiguration('cliHelper');
  const returnType = config.get('returnType', 'int');
  const defaultStatus = config.get('defaultStatusValue', '0');
  const argErrorStatus = config.get('statusOnArgumentError', '-1');

  const { groupName, briefDesc, funcName, args } = data;

  let enumEntries = '';
  let varDecls = '';
  let parseCalls = '';
  let argIndex = 1;

  args.forEach(arg => {
    const enumName = `ARG_${arg.name.toUpperCase()}`;
    enumEntries += `    ${enumName},\n`;

    let varType = '';
    let parseLine = '';

    switch (arg.parser) {
      case 'uint32':
        varType = 'CLIPAR_UINT32';
        parseLine = `if (!parse_uint32_in_range(argv[${argIndex}], ${arg.min}, ${arg.max}, &${arg.name})) return ${argErrorStatus};`;
        break;
      case 'uint64':
        varType = 'CLIPAR_UINT64';
        parseLine = `if (!parse_uint64_in_range(argv[${argIndex}], ${arg.min}, ${arg.max}, &${arg.name})) return ${argErrorStatus};`;
        break;
      case 'int':
        varType = 'CLIPAR_INT';
        parseLine = `if (!parse_int_in_range(argv[${argIndex}], ${arg.min}, ${arg.max}, &${arg.name})) return ${argErrorStatus};`;
        break;
      case 'float':
        varType = 'CLIPAR_FLOAT';
        parseLine = `if (!parse_float_in_range(argv[${argIndex}], ${arg.min}, ${arg.max}, &${arg.name})) return ${argErrorStatus};`;
        break;
      case 'hex':
        varType = 'CLIPAR_ULONG';
        parseLine = `if (!parse_hex_in_range(argv[${argIndex}], ${arg.min}, ${arg.max}, &${arg.name})) return ${argErrorStatus};`;
        break;
      case 'bool':
        varType = 'CLIPAR_BOOL';
        parseLine = `if (!parse_bool(argv[${argIndex}], &${arg.name})) return ${argErrorStatus};`;
        break;
      case 'string':
        varType = 'CLIPAR_UINT';
        const options = arg.options.split(',').map(s => `"${s.trim()}"`).join(', ');
        parseLine = `const char *${arg.name}_opts[] = { ${options} };
    if (!parse_string_option(argv[${argIndex}], ${arg.name}_opts, sizeof(${arg.name}_opts)/sizeof(${arg.name}_opts[0]), &${arg.name})) return ${argErrorStatus};`;
        break;
      case 'ip':
        parseLine = `if (!parse_ip_address(argv[${argIndex}])) return ${argErrorStatus}; // Manual IP storage required`;
        break;
      case 'ip_mask':
        parseLine = `if (!parse_ip_address_with_netmask(argv[${argIndex}])) return ${argErrorStatus}; // Manual IP/mask storage required`;
        break;
    }

    if (varType) {
      varDecls += `    ${varType} ${arg.name};\n`;
    }
    parseCalls += `    ${parseLine}\n`;
    argIndex++;
  });

  return `
/**
 * @ingroup ${groupName}
 * @brief ${briefDesc}
 * 
 * @param argc Expected to be the number of arguments defined below + command name.
 * @param argv Argument strings passed to the command.
${args.map((arg, idx) => ` *   - argv[${idx + 1}]: ${arg.description}`).join('\n')}
 */
${returnType} ${funcName}(int argc, char **argv) {
    #include "cli_args.h"
    enum {
${enumEntries}    ARG_COUNT
    };

    if (argc != ARG_COUNT) {
        return ${argErrorStatus};
    }

${varDecls}
${parseCalls}
    // Command logic here

    return ${defaultStatus};
}
`;
}

exports.activate = activate;

function deactivate() {}

module.exports = {
  activate,
  deactivate
};
