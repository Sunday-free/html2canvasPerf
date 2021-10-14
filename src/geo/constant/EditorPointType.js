/**
 * 编辑点类型
 * @private
 * @see EditorHandler
 */
 const EditorPointType = {
    /**
     * 质心点
     */
    Centriod: 'Centriod',

    /**
     * 底面顶点
     */
    Vertex: 'Vertex',

    /**
     * 底面顶点间的中心点
     */
    MiddlerVertex: 'MiddlerVertex',

    /**
     * 顶面的顶点
     */
    TopperVertex: 'TopperVertex',
}
export default Object.freeze(EditorPointType);