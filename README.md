# 🎯 @upsys/clickup-types

TypeScript type definitions for the ClickUp API, providing comprehensive type safety for ClickUp API interactions.

## 📦 Installation

```bash
git submodule add https://github.com/upsys/clickup-types.git
git submodule update --init --recursive
```

## ✨ Features

- 🔒 Complete type safety for ClickUp API requests and responses
- 📊 Comprehensive type definitions for:
  - Tasks and Task Management
  - Custom Fields
  - Workspaces and Team Hierarchy
  - Comments and Attachments
  - API Authentication
- 🛠️ Error handling types and utilities
- 📝 Well-documented interfaces

## 🚀 Usage

```typescript
import {
Task,
CreateTaskRequestParams,
ClickUpFieldType,
CustomField
} from '@upsys/clickup-types';
// Example: Type-safe task creation
const newTask: CreateTaskRequestParams = {
name: "New Task",
description: "Task description",
tags: ["important", "feature"]
};
// Example: Working with custom fields
const customField: CustomField = {
id: "123",
name: "Priority",
type: ClickUpFieldType.DROPDOWN,
type_config: {
options: [
{ id: "1", name: "High", color: "#ff0000", orderindex: 1 }
]
}
};
```

## 📚 Type Categories

- **Task Types**: Complete type definitions for tasks, including custom fields, attachments, and comments
- **Hierarchy Types**: Types for workspaces, spaces, folders, and lists
- **Field Types**: Comprehensive types for all ClickUp custom field types
- **API Types**: Core API types including authentication and error handling

## 🤝 Contributing

This package is currently private and maintained internally. For issues or suggestions, please contact the development team.

## 📄 License

Private - All rights reserved

---

Made with ❤️ by UpSys