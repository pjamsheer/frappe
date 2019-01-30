frappe.listview_settings['User Permission'] = {

	onload: function(list_view) {
		var me =this
		list_view.page.add_menu_item(__("Create/Update User Permissions"), function() {
			var dialog =new frappe.ui.Dialog({
				title : __('Add User Permissions'),
				fields: [
					{
						'fieldname': 'user',
						'label': __('For User'),
						'fieldtype': 'Link',
						'options': 'User',
						'reqd': 1,
						'onchange': function () {
							dialog.fields_dict.doctype.set_input(undefined)
							dialog.fields_dict.docname.set_input(undefined)
							dialog.set_df_property("docname", "hidden", 1)
							dialog.set_df_property("apply_to_all_doctypes", "hidden", 1)
							dialog.set_df_property("applicable_doctypes", "hidden", 1)
						}
					},
					{
						'fieldname': 'doctype',
						'label': __('Document Type'),
						'fieldtype': 'Link',
						'options': 'DocType',
						'reqd': 1,
						'onchange': function() {
							me.get_docname_options(dialog).then(options => {
								me.on_doctype_change(options, dialog)
							})
						}
					},
					{
						'fieldname': 'docname',
						'label': __('Document Name'),
						'fieldtype': 'Select',
						'hidden': 1,
						'onchange':  function(){
							me.get_applicable_doctype(dialog).then(applicable => {
								me.get_multi_select_options(dialog, applicable).then(options =>{
									me.on_docname_change(dialog, options, applicable)
							})
							})
						}
					},
					{
						'fieldname': 'apply_to_all_doctypes',
						'label': __('Apply to all Documents Type'),
						'fieldtype': 'Check',
						'checked': 1,
						'hidden': 1,
						'onchange': function() {
							if(dialog.fields_dict.doctype.value && dialog.fields_dict.docname.value && dialog.fields_dict.user.value){
								me.get_applicable_doctype(dialog).then(applicable => {
									me.get_multi_select_options(dialog, applicable).then(options =>{
										me.on_apply_to_all_doctypes_change(dialog,options)
								})
							})
						}
					}
					},
					{
						"label": __("Applicable Document Types"),
						"fieldname": "applicable_doctypes",
						"fieldtype": "MultiCheck",
						"options": [],
						"columns": 2,
						"hidden": 1
					},
				],
				primary_action: (data) => {
						data = me.validate(dialog, data)
						frappe.call({
							async: false,
							method: "frappe.core.doctype.user_permission.user_permission.add_user_permissions",
							args: {
								data : data
							},
							callback: function(r){
								if (r.message == 1){
									frappe.show_alert({message:__("User Permissions Created Sucessfully"), indicator:'blue'});
								}else{
									frappe.show_alert({message:__("Nothing to update"), indicator:'red'});

								}
							}
						})
					dialog.hide();
					list_view.refresh();
				},
				primary_action_label: __('Submit')
			});
			dialog.show();
		});

		list_view.page.add_menu_item(__("Clear User Permissions"), () => {
			const dialog = new frappe.ui.Dialog({
				title: __('Clear User Permissions'),
				fields: [
					{
						'fieldname': 'user',
						'label': __('For User'),
						'fieldtype': 'Link',
						'options': 'User',
						'reqd': 1
					},
					{
						'fieldname': 'for_doctype',
						'label': __('For Document Type'),
						'fieldtype': 'Link',
						'options': 'DocType',
						'reqd': 1
					},
				],
				primary_action: (data) => {
					// mandatory not filled
					if (!data) return;

					frappe.confirm(__('Are you sure?'), () => {
						frappe
							.xcall('frappe.core.doctype.user_permission.user_permission.clear_user_permissions', data)
							.then(data => {
								dialog.hide();
								let message = '';
								if (data === 0) {
									message = __('No records deleted');
								} else if(data === 1) {
									message = __('{0} record deleted', [data]);
								} else {
									message = __('{0} records deleted', [data]);
								}
								frappe.show_alert({
									message,
									indicator: 'green'
								});
								list_view.refresh();
							});
					});

				},
				primary_action_label: __('Clear')
			});

			dialog.show();
		});
	},

	validate: function(dialog, data){
		if(dialog.fields_dict.applicable_doctypes.get_unchecked_options().length == 0){
			data.apply_to_all_doctypes = 1
			data.applicable_doctypes = []
			return data
		}
		if(data.apply_to_all_doctypes == 0 && !("applicable_doctypes" in data) ){
			frappe.throw("Please select applicable Doctypes")
		}
	},

	get_applicable_doctype: function(dialog){
		return new Promise(resolve => {
			frappe.call({
				method: 'frappe.core.doctype.user_permission.user_permission.check_applicable_doc_perm',
				async: false,
				args:{
					user: dialog.fields_dict.user.value,
					doctype: dialog.fields_dict.doctype.value,
					docname: dialog.fields_dict.docname.value
				}}).then(r => {
					resolve(r.message)
				})
		})
	},

	get_multi_select_options: function(dialog, applicable){
		return new Promise(resolve => {
			frappe.call({
				method: 'frappe.desk.form.linked_with.get_linked_doctypes',
				async: false,
				args:{
					user: dialog.fields_dict.user.value,
					doctype: dialog.fields_dict.doctype.value,
					docname: dialog.fields_dict.docname.value
				}}).then(r => {
					var options = []
					for(var d in r.message){
						var checked = ($.inArray(d, applicable) != -1) ? 1 : 0;
						options.push({ "label":d, "value": d , "checked": checked})
					}
					resolve(options)
				})
		})
	},

	get_docname_options: function(dialog) {
		return new Promise(resolve => {
			var options = []
			if(dialog.fields_dict.doctype.value){
				frappe.call({
					method:"frappe.client.get_list",
					async: false,
					args: {
						doctype: dialog.fields_dict.doctype.value,
					},
					callback: function(r) {
						for(var d in r.message){
							options.push(r.message[d].name)
						}
						resolve(options)
					}
				});
			}
		})
	},

	on_doctype_change: function(options, dialog){
		dialog.set_df_property("docname", "options", options)
		dialog.set_df_property("docname", "hidden", 0)
		dialog.set_df_property("docname", "reqd", 1)
		dialog.set_df_property("apply_to_all_doctypes", "hidden", 0)
		dialog.set_value("apply_to_all_doctypes","checked",1)
	},

	on_docname_change: function(dialog, options, applicable){
		if(applicable.length != 0 ){
			dialog.set_primary_action("Update")
			dialog.set_title("Update User Permissions")
			dialog.set_df_property("applicable_doctypes", "options", options)
			if(dialog.fields_dict.applicable_doctypes.get_checked_options().length == options.length){
				dialog.set_df_property("applicable_doctypes", "hidden", 1)
				dialog.set_value("apply_to_all_doctypes", "checked", 1)
			}else{
				dialog.set_df_property("applicable_doctypes", "hidden", 0)
				dialog.set_df_property("apply_to_all_doctypes", "checked", 0)
			}
		}else{
			dialog.set_primary_action("Submit")
			dialog.set_title("Add User Permissions")
			dialog.set_value("apply_to_all_doctypes", "checked",1)
			dialog.set_df_property("applicable_doctypes", "options", options)
			dialog.set_df_property("applicable_doctypes", "hidden", 1)
		}
	},

	on_apply_to_all_doctypes_change: function(dialog, options){
		if(dialog.fields_dict.apply_to_all_doctypes.get_value() == 0){
			dialog.set_df_property("applicable_doctypes", "hidden", 0)
			dialog.set_df_property("applicable_doctypes", "options", options)
		}else{
			dialog.set_df_property("applicable_doctypes", "hidden", 1)
			dialog.set_df_property("applicable_doctypes", "options", options)
		}
	}
};