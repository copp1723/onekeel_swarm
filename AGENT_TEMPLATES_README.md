# Agent Templates Feature

This feature adds preconfigured agent templates with sophisticated system prompts for Sales, Service, and General Marketing use cases.

## Overview

The Agent Templates feature provides:

1. Default agent templates with sophisticated system prompts
2. Ability to clone and customize templates
3. Parameter injection for template customization
4. UI for browsing, filtering, and using templates

## Implementation Details

### Database Schema

- Added `agent_templates` table with fields for:
  - Basic template information (name, description, type, category)
  - System prompt and configuration
  - Configurable parameters and default values
  - Metadata for additional information

### Server-Side Components

- Migration script to create the table and add default templates
- API endpoints for:
  - Listing templates (all or by category)
  - Getting template details
  - Creating agents from templates
  - Cloning templates
  - Managing templates (admin only)

### Client-Side Components

- React components for:
  - Template cards
  - Template listing with filtering
  - Template details view
  - Template configuration for creating agents
- Navigation integration
- Hooks for template management

## Default Templates

### Sales Agent

A professional sales agent focused on lead qualification and conversion. Configurable parameters include:
- Company name
- Company information
- Product information
- Sales approach
- Tone

### Service Agent

A helpful customer service agent focused on resolving issues and providing support. Configurable parameters include:
- Company name
- Company information
- Product information
- Support approach
- Tone

### Marketing Agent

A creative marketing agent focused on engagement and campaign optimization. Configurable parameters include:
- Company name
- Company information
- Brand voice
- Target audience
- Marketing approach
- Tone

## Usage

1. Navigate to "Agent Templates" in the navigation menu
2. Browse available templates by category or search
3. View template details to see the full system prompt
4. Use a template to create a new agent with customized parameters
5. Clone a template to create your own version with modifications

## Advanced Usage

Advanced users can:
1. Clone default templates
2. Modify system prompts
3. Add or remove configurable parameters
4. Create custom templates for specific use cases

## Technical Notes

- Templates use a parameter injection system with `{{parameter_name}}` syntax
- Default parameters provide sensible starting values
- System prompts are designed to be comprehensive yet customizable
- Templates are categorized for easy organization