import { Button, Icon } from '@blueprintjs/core';
import { IconNames } from '@blueprintjs/icons';
import React, { useState } from 'react';
import { AchievementItem, FilterStatus } from 'src/features/achievement/AchievementTypes';
import { generateAchievementTasks } from 'src/pages/achievement/subcomponents/AchievementDashboard';

import AchievementView from '../AchievementView';
import AchievementInferencer from '../utils/AchievementInferencer';

type AchievementPreviewProps = {
  inferencer: AchievementInferencer;
  publishState: [boolean, any];
  publishAchievements: (achievements: AchievementItem[]) => void;
  // TODO: publishGoals: (goals: GoalDefinition[]) => void;
};

function AchievementPreview(props: AchievementPreviewProps) {
  const { inferencer, publishState, publishAchievements } = props;

  const achievements = inferencer.getAchievements();
  // TODO: const goals = inferencer.getGoalDefinitions();

  const [canPublish, setCanPublish] = publishState;
  const handlePublish = () => {
    // TODO: publishGoals(goals);
    publishAchievements(achievements);
    setCanPublish(false);
  };

  const [viewMode, setViewMode] = useState<boolean>(false);
  const toggleMode = () => setViewMode(!viewMode);

  // If an achievement is focused, the cards glow
  const focusState = useState<number>(-1);
  const [focusId] = focusState;

  return (
    <div className="achievement-preview">
      <div className="command">
        <Button
          className="command-button"
          icon={viewMode && IconNames.ARROW_LEFT}
          rightIcon={!viewMode && IconNames.ARROW_RIGHT}
          text={viewMode ? 'Task' : 'View'}
          onClick={toggleMode}
        />
        {canPublish && (
          <Button
            className="command-button"
            icon={IconNames.CLOUD_UPLOAD}
            intent="primary"
            text={'Publish Changes'}
            onClick={handlePublish}
          />
        )}
      </div>
      {viewMode ? (
        <div className="preview-container">
          {focusId < 0 ? (
            <div className="no-view">
              <Icon icon={IconNames.MOUNTAIN} iconSize={60} />
              <h2>Select an achievement</h2>
            </div>
          ) : (
            <AchievementView inferencer={inferencer} focusId={focusId} />
          )}
        </div>
      ) : (
        <ul className="preview-container">
          {generateAchievementTasks(inferencer, FilterStatus.ALL, focusState)}
        </ul>
      )}
    </div>
  );
}

export default AchievementPreview;