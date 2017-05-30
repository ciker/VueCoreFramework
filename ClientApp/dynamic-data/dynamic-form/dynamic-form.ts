﻿import Vue from 'vue';
import { Component, Prop, Watch } from 'vue-property-decorator';
import * as ErrorMsg from '../../error-msg';
import { FieldDefinition } from '../../store/field-definition';
import VueFormGenerator from 'vue-form-generator';
import { DataItem, Repository, OperationReply } from '../../store/repository';
import { router } from '../../router';

@Component
export default class DynamicFormComponent extends Vue {
    @Prop()
    id: string;

    @Prop()
    operation: string;

    @Prop()
    repository: Repository;

    @Prop()
    routeName: string;

    @Watch('id')
    onIdChanged(val: string, oldVal: string) {
        this.updateForm();
    }

    @Watch('operation')
    onOperationChanged(val: string, oldVal: string) {
        this.updateForm();
    }

    components = {
        'vue-form-generator': VueFormGenerator.component
    };

    activity = false;
    errorMessage = '';
    formOptions = {
        validateAfterLoad: true,
        validateAfterChanged: true
    };
    isValid = false;
    model: any = {};
    schema: any = {};
    vm: any;
    vmDefinition: Array<FieldDefinition>;

    mounted() {
        this.updateForm();
    }

    onValidated(isValid: boolean, errors: Array<any>) {
        this.isValid = isValid;
    }

    onCancel() {
        this.activity = false;
        this.errorMessage = '';
        this.$router.go(-1);
    }

    onCreate() {
        this.activity = true;
        this.errorMessage = '';
        let timestamp = Date.now();
        let d: DataItem = Object.assign({},
            this.model,
            {
                id: timestamp.toString(),
                creationTimestamp: timestamp,
                updateTimestamp: timestamp
            }
        );
        this.repository.add(this.$route.fullPath, d)
            .then(data => {
                if (data.error) {
                    this.errorMessage = data.error;
                } else {
                    this.$router.go(-1);
                }
                this.activity = false;
            })
            .catch(error => {
                this.activity = false;
                this.errorMessage = "A problem occurred. The new item could not be added.";
                ErrorMsg.logError("dynamic-form.onCreate", error);
            });
    }

    onDelete() {
        this.activity = true;
        this.model.deleteDialogShown = false;
        this.repository.removeChild(this.$route.fullPath, this.id, this.model.deleteProp, this.model.deleteId)
            .then(data => {
                if (data.error) {
                    this.errorMessage = data.error;
                }
                else {
                    this.updateForm();
                }
                this.activity = false;
            })
            .catch(error => {
                this.errorMessage = "A problem occurred. The item could not be removed.";
                this.activity = false;
                ErrorMsg.logError("dynamic-form.onDelete", error);
            });
    }

    onEdit() {
        this.$router.push({ name: this.routeName, params: { operation: 'edit', id: this.id } });
    }

    onSave() {
        this.activity = true;
        this.errorMessage = '';
        let d: DataItem = Object.assign({
                id: '0',
                creationTimestamp: 0,
                updateTimestamp: 0
            },
            this.model);
        this.repository.update(this.$route.fullPath, d)
            .then(data => {
                if (data.error) {
                    this.errorMessage = data.error;
                } else {
                    this.$router.go(-1);
                }
                this.activity = false;
            })
            .catch(error => {
                this.errorMessage = "A problem occurred. The item could not be updated.";
                this.activity = false;
                ErrorMsg.logError("dynamic-form.onSave", error);
            });
    }

    updateForm() {
        this.activity = true;
        this.errorMessage = '';
        this.repository.find(this.$route.fullPath, this.id)
            .then(data => {
                if (data.error) {
                    this.errorMessage = data.error;
                    this.activity = false;
                } else {
                    this.repository.getFieldDefinitions(this.$route.fullPath)
                        .then(defData => {
                            this.vmDefinition = defData;
                            this.vm = data.data;
                            this.model = {};
                            let groups = this.vmDefinition.filter(v => v.groupName !== undefined && v.groupName !== null).map(v => v.groupName);
                            if (groups.length) {
                                this.schema = { groups: [] };
                                for (var i = 0; i < groups.length; i++) {
                                    this.schema.groups[i] = { fields: [] };
                                    this.schema.groups[i].legend = groups[i];
                                }
                            }
                            this.schema = { fields: [] };
                            this.vmDefinition.forEach(field => {
                                this.model[field.model] = field.default || null;
                            });
                            for (var prop in this.vm) {
                                this.model[prop] = this.vm[prop];
                            }
                            this.vmDefinition.forEach(field => {
                                let newField: any = Object.assign({}, field);
                                if (newField.type === "label") {
                                    let idField = this.vmDefinition.find(v => v.model === newField.model + "Id");
                                    if (idField) {
                                        newField.buttons = [
                                            {
                                                classes: 'btn btn--dark btn--flat info--text',
                                                label: 'Details',
                                                onclick: function (model, field) {
                                                    router.push({ name: newField.model, params: { operation: 'details', id: model[field.model + "Id"] } });
                                                }
                                            },
                                            {
                                                classes: 'btn btn--dark btn--flat orange--text text--darken-2',
                                                label: 'Edit',
                                                onclick: function (model, field) {
                                                    router.push({ name: newField.model, params: { operation: 'edit', id: model[field.model + "Id"] } });
                                                }
                                            }
                                        ];
                                        if (!field.required) {
                                            newField.buttons.push({
                                                classes: 'btn btn--dark btn--flat red--text text--accent-4',
                                                label: 'Delete',
                                                onclick: function (model, field) {
                                                    model.deleteDialogShown = true;
                                                    model.deleteProp = field.model;
                                                    model.deleteId = model[field.model + "Id"];
                                                }
                                            });
                                        }
                                    }
                                }
                                if (this.schema.groups) {
                                    let group: any;
                                    if (field.groupName) {
                                        group = this.schema.groups.find(g => g.legend == field.groupName);
                                    } else {
                                        group = this.schema.groups.find(g => g.legend == "Other");
                                        if (!group) {
                                            group = { legend: "Other", fields: [] };
                                            this.schema.groups.push(group);
                                        }
                                    }
                                    group.fields.push(newField);
                                }
                                else {
                                    this.schema.fields.push(newField);
                                }
                            });
                            if (this.operation === 'details') {
                                this.schema.fields.forEach(f => f.readonly = true);
                            }
                            this.activity = false;
                        })
                        .catch(error => {
                            this.errorMessage = "A problem occurred while updating the data.";
                            this.activity = false;
                            ErrorMsg.logError("dynamic-form.updateForm", error);
                        });
                }
            })
            .catch(error => {
                this.errorMessage = "A problem occurred while updating the data.";
                this.activity = false;
                ErrorMsg.logError("dynamic-form.updateForm", error);
            });
    }
}