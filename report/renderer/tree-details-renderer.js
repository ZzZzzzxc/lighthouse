/**
 * @license Copyright 2023 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

/**
 * @fileoverview This file contains helpers for constructing and rendering tree details.
 */

/** @typedef {import('./dom.js').DOM} DOM */
/** @typedef {import('./details-renderer.js').DetailsRenderer} DetailsRenderer */
/**
 * @typedef Segment
 * @property {LH.FormattedIcu<LH.Audit.Details.TreeNode>} node
 * @property {boolean} isLastChild
 * @property {boolean} hasChildren
 * @property {boolean[]} treeMarkers
 */

class TreeRenderer {
  /**
   * Helper to create context for each node based on its
   * parent. Calculates if this node is the last child, whether it has any
   * children itself and what the tree looks like all the way back up to the root,
   * so the tree markers can be drawn correctly.
   * @param {LH.FormattedIcu<LH.Audit.Details.TreeNode>} node
   * @param {LH.FormattedIcu<LH.Audit.Details.TreeNode>} parent
   * @param {Array<boolean>=} treeMarkers
   * @param {boolean=} parentIsLastChild
   * @return {Segment}
   */
  static createSegment(node, parent, treeMarkers, parentIsLastChild) {
    const index = parent.children.indexOf(node);
    const isLastChild = index === (parent.children.length - 1);
    const hasChildren = !!node.children && node.children.length > 0;

    // Copy the tree markers so that we don't change by reference.
    const newTreeMarkers = Array.isArray(treeMarkers) ? treeMarkers.slice(0) : [];

    // Add on the new entry.
    if (typeof parentIsLastChild !== 'undefined') {
      newTreeMarkers.push(!parentIsLastChild);
    }

    return {
      node,
      isLastChild,
      hasChildren,
      treeMarkers: newTreeMarkers,
    };
  }

  /**
   * Creates the DOM for a tree segment.
   * @param {DOM} dom
   * @param {Segment} segment
   * @param {LH.FormattedIcu<LH.Audit.Details.Tree>} details
   * @param {DetailsRenderer} detailsRenderer
   * @return {Node}
   */
  static createTreeNode(dom, segment, details, detailsRenderer) {
    const nodeEl = dom.createComponent('treeNode');

    // Hovering over request shows full URL.
    if (details.nodeHeadings[0].valueType === 'url') {
      const url = segment.node.values[details.nodeHeadings[0].key];
      if (typeof url === 'string') {
        dom.find('.lh-tree-node', nodeEl).setAttribute('title', url);
      }
    }

    const treeMarkeEl = dom.find('.lh-tree-node__tree-marker', nodeEl);

    // Construct lines and add spacers for sub requests.
    segment.treeMarkers.forEach(separator => {
      const classSeparator = separator ?
        'lh-tree-marker lh-vert' :
        'lh-tree-marker';
      treeMarkeEl.append(
        dom.createElement('span', classSeparator),
        dom.createElement('span', 'lh-tree-marker')
      );
    });

    const classLastChild = segment.isLastChild ?
      'lh-tree-marker lh-up-right' :
      'lh-tree-marker lh-vert-right';
    const classHasChildren = segment.hasChildren ?
      'lh-tree-marker lh-horiz-down' :
      'lh-tree-marker lh-right';

    treeMarkeEl.append(
      dom.createElement('span', classLastChild),
      dom.createElement('span', 'lh-tree-marker lh-right'),
      dom.createElement('span', classHasChildren)
    );

    const treevalEl = dom.find('.lh-tree-node__tree-value', nodeEl);

    let numValuesRenderered = 0;
    let spanEl = null;
    for (const heading of details.nodeHeadings) {
      const value = segment.node.values[heading.key];
      if (!value) continue;

      const valueEl = detailsRenderer._renderTableValue(value, heading);
      if (!valueEl) continue;

      let parentEl = treevalEl;
      if (numValuesRenderered > 0) {
        if (!spanEl) {
          spanEl = dom.createChildOf(treevalEl, 'span');
          spanEl.textContent = ' - ';
        }
        parentEl = spanEl;
      }

      if (heading.label) parentEl.append(heading.label, ':', '\xa0');
      parentEl.append(valueEl);

      numValuesRenderered += 1;
    }

    return nodeEl;
  }

  /**
   * Recursively builds a tree from segments.
   * @param {DOM} dom
   * @param {DocumentFragment} tmpl
   * @param {Segment} segment
   * @param {Element} parentEl
   * @param {LH.FormattedIcu<LH.Audit.Details.Tree>} details
   * @param {DetailsRenderer} detailsRenderer
   */
  static buildTree(dom, tmpl, segment, parentEl, details, detailsRenderer) {
    parentEl.append(TreeRenderer.createTreeNode(dom, segment, details, detailsRenderer));
    for (const child of segment.node.children) {
      const childSegment = TreeRenderer.createSegment(child, segment.node,
        segment.treeMarkers, segment.isLastChild);
      TreeRenderer.buildTree(dom, tmpl, childSegment, parentEl, details, detailsRenderer);
    }
  }

  /**
   * @param {DOM} dom
   * @param {LH.FormattedIcu<LH.Audit.Details.Tree>} details
   * @param {DetailsRenderer} detailsRenderer
   * @return {Element}
   */
  static render(dom, details, detailsRenderer) {
    const tmpl = dom.createComponent('tree');
    const containerEl = dom.find('.lh-tree', tmpl);

    // Fill in top summary.
    for (const heading of details.noteHeadings) {
      const value = details.notes[heading.key];
      if (!value) continue;

      const valueEl = detailsRenderer._renderTableValue(value, heading);
      if (!valueEl) continue;

      const noteEl = dom.createChildOf(containerEl, 'div', 'lh-tree-note');
      noteEl.append(heading.label, ':', '\xa0', valueEl);
    }

    // Construct visual tree.
    const segment =
      TreeRenderer.createSegment(details.root, {children: [details.root], values: {}});
    TreeRenderer.buildTree(dom, tmpl, segment, containerEl, details, detailsRenderer);

    return dom.find('.lh-tree-container', tmpl);
  }
}

export {
  TreeRenderer,
};
