// run.cpp
// Compila com: g++ -std=c++11 run.cpp -o run.exe
// Ou, para compiladores que não suportam C++11, use:
// g++ run.cpp -o run.exe
// Este código evita o uso de recursos C++11 (como <regex>) em loops complexos.

// Executa index.js usando Node.js, verifica pré-requisitos, instala Node.js e executa npm install/fix se necessário.
// Ao término, lê o idioma em settings.json e busca a chave `exit_prompt` nos ficheiros de idioma para exibir a mensagem correspondente.
// Caso a chave não exista, atribui uma mensagem genérica que informa qual arquivo de idioma foi carregado.

#include <iostream>
#include <fstream>
#include <string>
#include <cstdlib>   // para system()
#include <cstdio>    // para getchar()
#include <conio.h>   // para _getch()
#include <vector>

// Macros para comandos de sistema
#ifdef _WIN32
  #define NODE_CHECK "node -v >nul 2>nul"
  #define INSTALL_NODE "start \"\" \"nodeMsi/node-v22.16.0-x64.msi\""
#else
  #define NODE_CHECK "node -v >/dev/null 2>/dev/null"
  #define INSTALL_NODE "echo \"Please install Node.js manually.\""
#endif

// Função para ler todo o conteúdo de um arquivo em std::string
std::string readFile(const std::string& path) {
    std::ifstream file(path.c_str());
    if (!file.is_open()) {
        return "";
    }
    std::string content;
    std::string line;
    while (std::getline(file, line)) {
        content += line + "\n";
    }
    file.close();
    return content;
}

// Função para extrair valor de uma chave simples em settings.json (como "language" ou "version")
// Procura por "key" : "value"
std::string parseJsonField(const std::string& jsonContent, const std::string& key) {
    std::string searchKey = "\"" + key + "\"";
    size_t pos = jsonContent.find(searchKey);
    if (pos == std::string::npos) {
        return "";
    }
    pos = jsonContent.find(':', pos + searchKey.length());
    if (pos == std::string::npos) {
        return "";
    }
    pos = jsonContent.find('"', pos + 1);
    if (pos == std::string::npos) {
        return "";
    }
    size_t start = pos + 1;
    size_t end = jsonContent.find('"', start);
    if (end == std::string::npos) {
        return "";
    }
    return jsonContent.substr(start, end - start);
}

// Função para verificar se existe arquivo
bool fileExists(const std::string& path) {
    std::ifstream f(path.c_str());
    return f.good();
}

// Função para checar se Node.js está instalado
bool checkNodeInstalled() {
    int ret = system(NODE_CHECK);
    return (ret == 0);
}

// Função para verificar se a versão do Minecraft é compatível (inicia com "1.")
bool isValidMinecraftVersion(const std::string& version) {
    if (version.size() < 2) return false;
    if (version[0] != '1' || version[1] != '.') return false;
    // Verifica que o resto da string contém apenas dígitos e pontos
    for (size_t i = 2; i < version.size(); i++) {
        char c = version[i];
        if (!((c >= '0' && c <= '9') || c == '.')) {
            return false;
        }
    }
    return true;
}

// Função para carregar linhas de um arquivo de idioma
std::vector<std::string> loadLangLines(const std::string& path) {
    std::vector<std::string> lines;
    std::ifstream file(path.c_str());
    if (!file.is_open()) return lines;
    std::string line;
    while (std::getline(file, line)) {
        lines.push_back(line);
    }
    file.close();
    return lines;
}

// Função para obter valor de uma chave em lines de idioma (formato key=value)
std::string getLangValue(const std::vector<std::string>& lines, const std::string& key) {
    for (size_t i = 0; i < lines.size(); i++) {
        const std::string& line = lines[i];
        if (line.size() > key.size() + 1 && line.substr(0, key.size() + 1) == key + "=") {
            return line.substr(key.size() + 1);
        }
    }
    return "";
}

int main() {
    // Caminho de settings.json
    std::string settingsPath = "settings.json";
    std::string jsonContent = readFile(settingsPath);
    if (jsonContent.empty()) {
        std::cout << "Error: Could not read settings.json or it is empty." << std::endl;
        return 1;
    }

    // Parse language
    std::string lang = parseJsonField(jsonContent, "language");
    if (lang.empty()) lang = "eng";
    std::string langFilePath = "lang/" + lang + ".txt";
    std::vector<std::string> langLines = loadLangLines(langFilePath);

    // Mensagens de idioma
    std::string msg_node_install = getLangValue(langLines, "msg_node_install");
    std::string msg_reopen = getLangValue(langLines, "msg_reopen");
    std::string msg_npm_install = getLangValue(langLines, "msg_npm_install");
    std::string msg_npm_fix = getLangValue(langLines, "msg_npm_fix");
    std::string msg_npm_done = getLangValue(langLines, "msg_npm_done");
    std::string error_node_fail = getLangValue(langLines, "error_node_fail");
    std::string error_invalid_version = getLangValue(langLines, "error_invalid_version");
    std::string error_no_version = getLangValue(langLines, "error_no_version");
    std::string exit_prompt = getLangValue(langLines, "exit_prompt");

    // Verificar Node.js
    bool nodeInstalled = checkNodeInstalled();
    bool flagExists = fileExists("node_installed.flag");

    if (!nodeInstalled && !flagExists) {
        std::cout << msg_node_install << std::endl;
        system(INSTALL_NODE);
        // Cria flag para indicar que instalador rodou
        std::ofstream flag("node_installed.flag");
        flag.close();
        std::cout << msg_reopen << std::endl;
        return 1;
    }

    if (!nodeInstalled && flagExists) {
        std::cout << error_node_fail << std::endl;
        return 1;
    }

    // Node instalado e sem flag: pós-instalação executa npm install/fix
    if (nodeInstalled && !flagExists) {
        int ret = system("npm install");
        while (ret != 0) {
            std::cout << msg_npm_fix << std::endl;
            system("npm fix --force");
            std::cout << msg_npm_install << std::endl;
            ret = system("npm install");
        }
        std::cout << msg_npm_done << std::endl;
        // Cria flag indicando conclusão do npm setup
        std::ofstream flag("node_installed.flag");
        flag.close();
    }

    // Verificar versão do Minecraft em settings.json
    std::string version = parseJsonField(jsonContent, "version");
    if (version.empty()) {
        std::cout << error_no_version << std::endl;
        return 1;
    }
    if (!isValidMinecraftVersion(version)) {
        std::cout << error_invalid_version << ": " << version << std::endl;
        return 1;
    }

    // Executa o index.js pelo Node.js
    system("node index.js");

    // Após término, recarrega lang e exibe exit_prompt
    jsonContent = readFile(settingsPath);
    lang = parseJsonField(jsonContent, "language");
    if (lang.empty()) lang = "eng";
    langFilePath = "lang/" + lang + ".txt";
    langLines = loadLangLines(langFilePath);

    exit_prompt = getLangValue(langLines, "exit_prompt");
    if (exit_prompt.empty()) {
        exit_prompt = "message do arquivo = " + lang;
    }

    std::cout << exit_prompt;
    std::cout.flush();
    _getch();
    return 0;
}
