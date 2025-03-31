// VSCode Extension Entry Point for CLI Command Generator (Webview Version)

const vscode = require('vscode');

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  let disposable = vscode.commands.registerCommand('cliHelper.generateCLICommand', function () {
    const panel = vscode.window.createWebviewPanel(
      'cliCommandForm',
      'Generate CLI Command',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true
      }
    );

    const contextTypesKey = 'cliHelper.customArgTypes';
    const config = vscode.workspace.getConfiguration('cliHelper');
    const previousCustomTypes = context.globalState.get(contextTypesKey, []);

    panel.webview.html = getWebviewContent(previousCustomTypes);

    panel.webview.onDidReceiveMessage(
      message => {
        if (message.command === 'generate') {
          const returnType = config.get('returnType') || 'AppStatus_t';
          const printFunc = config.get('printFunction') || 'printf';
          const defaultStatus = config.get('defaultStatusValue') || 'APPERR_OK';
          const statusOnArgError = config.get('statusOnArgumentError') || 'APPERR_BAD_ARGUMENT';

          const { groupName, briefDesc, funcName, args } = message.data;

          const usageArgs = args.map(a => `<${a.name}>`).join(' ');
          const paramDocs = args.map(a => ` *   - \`${a.name}\` - ${a.desc}`).join('\n');
          const enumLines = args.map(a => `        ARG_${a.name},`).join('\n');
          const printfArgs = args.map(arg => `    ${printFunc}(\"  ${arg.name}: ${arg.desc}\\n\");`).join('\n');
          const declarations = args.map(arg => `    ${arg.type} ${arg.name};`).join('\n');
          const parsingComments = args.map(arg => `    // TODO: Parse argument '${arg.name}' - ${arg.desc}`).join('\n');

          const code = `/**
 * @ingroup ${groupName}
 * @brief ${briefDesc}
 *
 * **Usage:**
 * \`\`\`
 * ${funcName} ${usageArgs}
 * \`\`\`
 *
 * @param argc Number of arguments (should be ${args.length})
 * @param argv Argument list:
${paramDocs}
 *
 * @return ${returnType} Error code (APPERR_OK on success)
 */
${returnType} ${funcName}(int argc, char **argv) {
    ${returnType} status = ${defaultStatus};

    enum {
        ARG_help = -1,
${enumLines}
        ARG_num_of_args
    };

    if (argc <= ARG_help) {
        goto print_help;
    }

    if (argc != ARG_num_of_args) {
        status = ${statusOnArgError};
        ${printFunc}(\"Invalid argument count! Expected %d, got %d\\n\", ARG_num_of_args, argc);
        goto print_help;
    }

${declarations}

${parsingComments}

    // ===================================
    // TODO: Implement core command logic
    // ===================================

    goto done;

print_help:
    ${printFunc}(\"${briefDesc}\\n\");
    ${printFunc}(\"Usage: ${funcName} ${usageArgs}\\n\");
${printfArgs}

done:
    return status;
}`;

          const editor = vscode.window.activeTextEditor;
          if (editor) {
            editor.edit(editBuilder => {
              editBuilder.insert(editor.selection.active, code + '\n');
            });
          } else {
            vscode.window.showInformationMessage('No active editor found to insert generated code.');
          }
        } else if (message.command === 'saveCustomType') {
          const newType = message.customType;
          if (!previousCustomTypes.includes(newType)) {
            previousCustomTypes.push(newType);
            context.globalState.update(contextTypesKey, previousCustomTypes);
          }
        }
      },
      undefined,
      context.subscriptions
    );
  });

  context.subscriptions.push(disposable);
}

function deactivate() {}

function getWebviewContent(savedCustomTypes) {
  const stdTypes = ["uint8_t", "int8_t", "uint16_t", "int16_t", "uint32_t", "int32_t", "uint64_t", "int64_t", "char*", "float", "double"];
  const typeOptions = stdTypes.concat(savedCustomTypes).map(type => `<option value=\"${type}\">${type}</option>`).join('');

  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CLI Command Form</title>
    <style>
      body { font-family: sans-serif; padding: 1rem; }
      input, select { margin: 0.25rem 0.5rem 0.5rem 0; padding: 0.25rem; }
      label { display: block; margin-top: 0.75rem; }
      .arg { margin-bottom: 1rem; border-bottom: 1px dashed #ccc; padding-bottom: 0.5rem; }
      button { margin-top: 0.5rem; }
    </style>
  </head>
  <body>
    <h2>CLI Command Generator</h2>
    <form id="cli-form">
      <label>Group Name: <input type="text" id="groupName"></label>
      <label>Brief Description: <input type="text" id="briefDesc"></label>
      <label>Function Name: <input type="text" id="funcName"></label>

      <h3>Arguments</h3>
      <div id="arg-list"></div>
      <button type="button" onclick="addArg()">Add Argument</button>
      <button type="submit">Generate</button>
    </form>

    <script>
      const vscode = acquireVsCodeApi();

      window.onload = () => {
        document.getElementById('cli-form').addEventListener('submit', (e) => {
          e.preventDefault();
          const args = [...document.querySelectorAll('.arg')].map(div => {
            const typeSelect = div.querySelector('.arg-type');
            const customInput = div.querySelector('.arg-type-custom');
            const type = typeSelect.value === 'custom' && customInput.value.trim()
              ? customInput.value.trim()
              : typeSelect.value;
            return {
              name: div.querySelector('.arg-name').value,
              desc: div.querySelector('.arg-desc').value,
              type
            };
          });

          console.log("Sending message to extension:", args);

          vscode.postMessage({
            command: 'generate',
            data: {
              groupName: document.getElementById('groupName').value,
              briefDesc: document.getElementById('briefDesc').value,
              funcName: document.getElementById('funcName').value,
              args
            }
          });
        });
      };

      function addArg() {
        const container = document.getElementById('arg-list');
        const div = document.createElement('div');
        div.className = 'arg';

        const nameInput = document.createElement('input');
        nameInput.className = 'arg-name';
        nameInput.placeholder = 'Arg name';

        const descInput = document.createElement('input');
        descInput.className = 'arg-desc';
        descInput.placeholder = 'Arg description';

        const typeSelect = document.createElement('select');
        typeSelect.className = 'arg-type';

        const options = [
          "uint8_t", "int8_t", "uint16_t", "int16_t", "uint32_t", "int32_t",
          "uint64_t", "int64_t", "char*", "float", "double"
        ];

        options.forEach(type => {
          const opt = document.createElement('option');
          opt.value = type;
          opt.text = type;
          typeSelect.appendChild(opt);
        });

        const customOption = document.createElement('option');
        customOption.value = 'custom';
        customOption.text = '-- Custom --';
        typeSelect.appendChild(customOption);

        const customInput = document.createElement('input');
        customInput.className = 'arg-type-custom';
        customInput.placeholder = 'Custom type (optional)';
        customInput.style.display = 'none';

        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.textContent = 'Remove';
        removeBtn.onclick = () => div.remove();

        const br = document.createElement('br');

        typeSelect.addEventListener('change', () => {
          if (typeSelect.value === 'custom') {
            customInput.style.display = 'inline-block';
            customInput.focus();
          } else {
            customInput.style.display = 'none';
          }
        });

        customInput.addEventListener('blur', () => {
          const custom = customInput.value.trim();
          if (custom) {
            vscode.postMessage({ command: 'saveCustomType', customType: custom });
            const option = document.createElement('option');
            option.value = custom;
            option.text = custom;
            option.selected = true;
            typeSelect.appendChild(option);
            customInput.style.display = 'none';
          }
        });

        div.appendChild(nameInput);
        div.appendChild(descInput);
        div.appendChild(typeSelect);
        div.appendChild(customInput);
        div.appendChild(removeBtn);
        div.appendChild(br);
        container.appendChild(div);
      }
    </script>
  </body>
  </html>
  `;
}

module.exports = {
  activate,
  deactivate
};
