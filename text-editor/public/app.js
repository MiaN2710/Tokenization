const { createApp } = Vue;

createApp({
    data() {
        return {
            textContent: null,
            loading: false,
            error: null,
            activeTab: 'markdown',
            fileChanged: {},
            configChanged: false,
            templateChanged: {},
            toast: {
                show: false,
                message: '',
                type: 'success'
            }
        };
    },
    computed: {
        tabs() {
            if (!this.textContent) return [];
            
            return [
                {
                    key: 'markdown',
                    label: 'Markdown Files',
                    count: Object.keys(this.textContent.markdown || {}).length
                },
                {
                    key: 'config',
                    label: 'Configuration',
                    count: this.textContent.config ? 1 : 0
                },
                {
                    key: 'templates',
                    label: 'HTML Templates',
                    count: Object.keys(this.textContent.templates || {}).length
                }
            ];
        },
        hasChanges() {
            const fileChanges = this.fileChanged && Object.keys(this.fileChanged).some(key => this.fileChanged[key]);
            const templateChanges = this.templateChanged && Object.keys(this.templateChanged).some(key => this.templateChanged[key]);
            return fileChanges || this.configChanged || templateChanges;
        }
    },
    methods: {
        async scanContent() {
            this.loading = true;
            this.error = null;
            
            try {
                const response = await fetch('/api/scan');
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const data = await response.json();
                this.textContent = data;
                this.resetChangeTracking();
                this.showToast('Content scanned successfully!', 'success');
            } catch (err) {
                this.error = err.message;
                this.showToast('Error scanning content: ' + err.message, 'error');
            } finally {
                this.loading = false;
            }
        },
        
        async saveMarkdownFile(filename) {
            if (!this.fileChanged[filename]) return;
            
            try {
                const file = this.textContent.markdown[filename];
                const response = await fetch('/api/update-markdown', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        filePath: file.path,
                        frontmatter: file.frontmatter,
                        content: file.content
                    })
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                this.fileChanged[filename] = false;
                this.showToast(`Saved ${filename}`, 'success');
            } catch (err) {
                this.showToast('Error saving file: ' + err.message, 'error');
            }
        },
        
        async saveConfig() {
            if (!this.configChanged) return;
            
            try {
                // Update extracted texts back into the config data
                this.updateConfigFromExtractedTexts();
                
                const response = await fetch('/api/update-config', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        filePath: this.textContent.config.path,
                        config: this.textContent.config.data
                    })
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                this.configChanged = false;
                this.showToast('Configuration saved', 'success');
            } catch (err) {
                this.showToast('Error saving config: ' + err.message, 'error');
            }
        },
        
        async saveTemplate(filename) {
            if (!this.templateChanged[filename]) return;
            
            try {
                const template = this.textContent.templates[filename];
                
                // Update template content with modified texts
                let updatedContent = template.content;
                template.extractedTexts.forEach(textItem => {
                    updatedContent = updatedContent.replace(textItem.original, `>${textItem.text}<`);
                });
                
                const response = await fetch('/api/update-template', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        filePath: template.path,
                        content: updatedContent
                    })
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                this.templateChanged[filename] = false;
                this.showToast(`Saved ${filename}`, 'success');
            } catch (err) {
                this.showToast('Error saving template: ' + err.message, 'error');
            }
        },
        
        updateConfigFromExtractedTexts() {
            // Update the config data object with values from extractedTexts
            this.textContent.config.extractedTexts.forEach(textItem => {
                const pathParts = textItem.path.split('.');
                let current = this.textContent.config.data;
                
                // Navigate to the correct nested object
                for (let i = 0; i < pathParts.length - 1; i++) {
                    const part = pathParts[i];
                    if (part.includes('[') && part.includes(']')) {
                        const [key, indexStr] = part.split('[');
                        const index = parseInt(indexStr.replace(']', ''));
                        current = current[key][index];
                    } else {
                        current = current[part];
                    }
                }
                
                // Set the final value
                const finalKey = pathParts[pathParts.length - 1];
                if (finalKey.includes('[') && finalKey.includes(']')) {
                    const [key, indexStr] = finalKey.split('[');
                    const index = parseInt(indexStr.replace(']', ''));
                    current[key][index] = textItem.value;
                } else {
                    current[finalKey] = textItem.value;
                }
            });
        },
        
        markFileChanged(filename) {
            this.fileChanged[filename] = true;
        },
        
        markTemplateChanged(filename) {
            this.templateChanged[filename] = true;
        },
        
        resetChangeTracking() {
            this.fileChanged = {};
            this.configChanged = false;
            this.templateChanged = {};
        },
        
        exportChanges() {
            try {
                const changes = {
                    timestamp: new Date().toISOString(),
                    markdown: {
                        changed: Object.keys(this.fileChanged).filter(key => this.fileChanged[key]),
                        files: {}
                    },
                    config: {
                        changed: this.configChanged,
                        data: this.configChanged ? this.textContent.config.data : null
                    },
                    templates: {
                        changed: Object.keys(this.templateChanged).filter(key => this.templateChanged[key]),
                        files: {}
                    }
                };

                // Include actual changed content
                if (this.textContent && this.textContent.markdown) {
                    changes.markdown.changed.forEach(filename => {
                        changes.markdown.files[filename] = this.textContent.markdown[filename];
                    });
                }

                if (this.textContent && this.textContent.templates) {
                    changes.templates.changed.forEach(filename => {
                        changes.templates.files[filename] = {
                            extractedTexts: this.textContent.templates[filename].extractedTexts,
                            path: this.textContent.templates[filename].path
                        };
                    });
                }
                
                const blob = new Blob([JSON.stringify(changes, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `kinetic-text-changes-${new Date().toISOString().slice(0, 10)}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                this.showToast('Changes exported successfully!', 'success');
            } catch (error) {
                console.error('Export error:', error);
                this.showToast('Export failed: ' + error.message, 'error');
            }
        },
        
        showToast(message, type = 'success') {
            this.toast = { show: true, message, type };
            setTimeout(() => {
                this.toast.show = false;
            }, 3000);
        }
    },
    
    mounted() {
        // Auto-scan content on load
        this.scanContent();
    }
}).mount('#app');