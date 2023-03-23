import fs from 'fs/promises';
import path from 'path';
import {
  AutodocConfig,
  FileSummary,
  FolderSummary,
  ProcessFile,
} from '../../../types';
import { traverseFileSystem } from '../../utils/traverseFileSystem';
import { spinnerSuccess, updateSpinnerText } from '../../spinner';
import { getFileName } from '../../utils/FileUtil';

export const convertJsonToMarkdown = async ({
  name: projectName,
  root: inputRoot,
  output: outputRoot,
}: AutodocConfig) => {
  /**
   * Count the number of files in the project
   */
  let files = 0;
  await traverseFileSystem({
    inputPath: inputRoot,
    projectName,
    processFile: () => {
      files++;
      return Promise.resolve();
    },
    ignore: [],
  });

  /**
   * Create markdown files for each code file in the project
   */

  const processFile: ProcessFile = async ({
    fileName,
    filePath,
  }): Promise<void> => {
    const content = await fs.readFile(filePath, 'utf-8');

    // TODO: Handle error
    if (!content) return;

    const markdownFilePath = path
      .join(outputRoot, filePath)
      .replace(inputRoot, '');

    /**
     * Create the output directory if it doesn't exist
     */
    try {
      await fs.mkdir(markdownFilePath.replace(fileName, ''), {
        recursive: true,
      });
    } catch (error) {
      console.error(error);
      return;
    }

    const { githubUrl, summary, questions } =
      fileName === 'summary.json'
        ? (JSON.parse(content) as FolderSummary)
        : (JSON.parse(content) as FileSummary);

    /**
     * Only include the file if it has a summary
     */
    const markdown =
      summary.length > 0
        ? `[View code on GitHub](${githubUrl})\n\n${summary}\n${
            questions ? '## Questions: \n ' + questions : ''
          }`
        : '';

    const outputPath = getFileName(markdownFilePath, '.', '.md');
    await fs.writeFile(outputPath, JSON.stringify(markdown), 'utf-8');
  };

  updateSpinnerText(`Creating ${files} mardown files...`);
  await traverseFileSystem({
    inputPath: inputRoot,
    projectName,
    processFile,
    ignore: [],
  });
  spinnerSuccess(`Created ${files} mardown files...`);
};
